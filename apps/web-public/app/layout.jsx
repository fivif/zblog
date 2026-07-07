import "./globals.css";
import "plyr/dist/plyr.css";

import { ThemeProviderScript } from "../components/theme-script";

export const metadata = {
  title: "Zay Blog",
  description: "一个以 Markdown 写作为核心的个人博客，记录日常、新闻、技术、嵌入式与人工智能。",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProviderScript />
        {children}
      </body>
    </html>
  );
}
