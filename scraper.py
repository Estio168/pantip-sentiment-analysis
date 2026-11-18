"""Retrieve accessible comments from a permitted public Pantip topic."""

import re
from urllib.parse import urlencode, urlsplit
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup
import requests

HOSTS = ("pantip.com", "www.pantip.com")
USER_AGENT = "PantipSentimentStudy/1.0"
TIMEOUT = (5, 12)
CSV_ROUTE = " สามารถอัปโหลดความคิดเห็นจากไฟล์ CSV แทนได้"


def validate_topic_url(url):
    try:
        url = url.strip()
        parts = urlsplit(url)
        host = parts.hostname
        if (
            any(char.isspace() or ord(char) < 32 for char in url)
            or parts.scheme != "https"
            or host not in HOSTS
            or parts.netloc.lower() not in (host, f"{host}:443")
            or re.fullmatch(r"/topic/[0-9]+/?", parts.path) is None
        ):
            raise ValueError
    except ValueError as exc:
        raise ValueError(
            "กรุณาใช้ลิงก์กระทู้ HTTPS ของ Pantip เช่น https://pantip.com/topic/12345678"
            + CSV_ROUTE
        ) from exc
    return f"https://{host}{parts.path.rstrip('/')}"


def comment_text(node):
    for unwanted in node.select("script, style"):
        unwanted.decompose()
    for br in node.select("br"):
        br.replace_with("\n")
    return node.get_text().strip()


def topic_content(soup):
    title = soup.select_one(".display-post-title") or soup.select_one("h1") or soup.title
    topic_title = title.get_text(" ", strip=True) if title else ""
    comments = []
    seen_ids = set()
    for node in soup.select(".comment-wrapper .display-post-story, .comment-item .comment-text"):
        if node.find_parent(class_="main-post"):
            continue
        wrapper = node.find_parent(class_="display-post-wrapper")
        wrapper_id = wrapper.get("id", "") if wrapper else ""
        match = re.fullmatch(r"(?:topcomment|comment)-([0-9]+)", wrapper_id)
        comment_id = match.group(1) if match else None
        if comment_id and comment_id in seen_ids:
            continue
        comment = comment_text(node)
        if comment:
            comments.append(comment)
            if comment_id:
                seen_ids.add(comment_id)
    return topic_title, comments


def parse_topic_html(html):
    encoding = "utf-8" if isinstance(html, bytes) else None
    return topic_content(BeautifulSoup(html, "html.parser", from_encoding=encoding))


def check_public_response(response, resource):
    if response.status_code == 429:
        raise ValueError("Pantip จำกัดจำนวนคำขอ กรุณารอสักครู่" + CSV_ROUTE)
    if response.status_code != 200:
        raise ValueError(f"เข้าถึง{resource}ไม่ได้ (HTTP {response.status_code})" + CSV_ROUTE)


def fetch_public_comments(session, rules, topic_url, soup):
    """Read the first page of top-level comments loaded by the public topic."""
    parts = urlsplit(topic_url)
    topic_id = parts.path.rsplit("/", 1)[-1]
    topic_type = soup.select_one("#topic-type")
    if (
        not soup.select_one(f'.main-post[id="topic-{topic_id}"]')
        or not soup.select_one("#comments-jsrender")
        or not topic_type
        or not re.fullmatch(r"[0-9]{1,2}", topic_type.get("value", ""))
    ):
        return []

    query = urlencode({"tid": topic_id, "param": "", "type": topic_type["value"]})
    url = f"https://{parts.hostname}/forum/topic/render_comments?{query}"
    if rules is not None and not rules.can_fetch(USER_AGENT, url):
        raise ValueError("กฎ robots.txt ไม่อนุญาตให้ดึงรายการความคิดเห็นนี้" + CSV_ROUTE)

    response = session.get(
        url, allow_redirects=False, timeout=TIMEOUT,
        headers={
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": topic_url,
        },
    )
    check_public_response(response, "รายการความคิดเห็นสาธารณะ")
    try:
        payload = response.json()
        paging = payload["paging"]
        entries = payload["comments"]
        if (
            str(paging["topic_id"]) != topic_id
            or str(paging["page"]) != "1"
            or not isinstance(entries, list)
        ):
            raise ValueError
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("ข้อมูลความคิดเห็นที่ Pantip ส่งกลับอยู่ในรูปแบบที่แอปอ่านไม่ได้" + CSV_ROUTE) from exc

    comments = []
    for entry in entries:
        if not isinstance(entry, dict) or entry.get("status") not in (1, "1") or entry.get("is_mute"):
            continue
        message = entry.get("message")
        if isinstance(message, str):
            comment = comment_text(BeautifulSoup(message, "html.parser"))
            if comment:
                comments.append(comment)
    return comments


def fetch_topic(url):
    url = validate_topic_url(url)
    robots_url = f"https://{urlsplit(url).hostname}/robots.txt"
    try:
        with requests.Session() as session:
            session.headers["User-Agent"] = USER_AGENT
            robots = session.get(robots_url, allow_redirects=False, timeout=TIMEOUT)
            rules = None
            if robots.status_code == 200:
                rules = RobotFileParser(robots_url)
                rules.parse(robots.text.splitlines())
                if not rules.can_fetch(USER_AGENT, url):
                    raise ValueError("กฎ robots.txt ไม่อนุญาตให้ดึงกระทู้นี้" + CSV_ROUTE)
            elif robots.status_code not in (404, 410):
                raise ValueError("ตรวจสอบกฎการเข้าถึง Pantip ไม่ได้" + CSV_ROUTE)

            response = session.get(url, allow_redirects=False, timeout=TIMEOUT)
            check_public_response(response, "กระทู้สาธารณะ")
            soup = BeautifulSoup(response.content, "html.parser", from_encoding="utf-8")
            title, comments = topic_content(soup)
            if not comments:
                comments = fetch_public_comments(session, rules, url, soup)
    except requests.Timeout as exc:
        raise ValueError("Pantip ใช้เวลาตอบสนองนานเกินไป" + CSV_ROUTE) from exc
    except requests.RequestException as exc:
        raise ValueError("เชื่อมต่อ Pantip ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต" + CSV_ROUTE) from exc

    if not comments:
        raise ValueError("ไม่พบความคิดเห็นที่มีข้อความและเปิดให้อ่านแบบสาธารณะ" + CSV_ROUTE)
    return title, comments
