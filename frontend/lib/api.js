export async function api(path, options = {}) {
  // Polling and result reads are safe to repeat if a loopback socket closes.
  const attempts = (options.method || "GET") === "GET" ? 3 : 1;
  const request = {
    ...options,
    cache: "no-store",
    headers: { "x-pantip-console": "local", ...options.headers },
  };
  let res;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      res = await fetch("/api" + path, request);
      if (res.status < 500 || attempt === attempts) break;
    } catch {
      if (attempt === attempts)
        throw new Error("เชื่อมต่อบริการในเครื่องไม่ได้ กรุณาตรวจสอบ FastAPI");
    }
    await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json)
    throw new Error(
      typeof json?.detail === "string"
        ? json.detail
        : "บริการประมวลผลยังไม่พร้อม กรุณาลองอีกครั้ง",
    );
  return json;
}
export const jsonPost = (data) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
export const labels = {
  positive: "เชิงบวก",
  negative: "เชิงลบ",
  neutral: "เป็นกลาง",
};
export const colors = {
  positive: "bg-pos",
  negative: "bg-neg",
  neutral: "bg-neu",
};
export const fmt = (n) => new Intl.NumberFormat("th-TH").format(n);
