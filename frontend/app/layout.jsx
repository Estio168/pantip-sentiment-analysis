import "./globals.css";
import localFont from "next/font/local";
import { ConsoleProvider } from "../components/Console";
const seed = localFont({
  src: [
    { path: "./fonts/LINESeedSansTH_Rg.ttf", weight: "400" },
    { path: "./fonts/LINESeedSansTH_Bd.ttf", weight: "700" },
  ],
  variable: "--seed",
  display: "swap",
});
export const metadata = {
  title: "Pantip Sentiment",
};
export default function Layout({ children }) {
  return (
    <html
      lang="th"
      className={
        seed.variable +
        " lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:w-0"
      }
    >
      <body className="min-h-screen bg-ink font-sans text-primary antialiased selection:bg-aqua selection:text-ink">
        <ConsoleProvider>{children}</ConsoleProvider>
      </body>
    </html>
  );
}
