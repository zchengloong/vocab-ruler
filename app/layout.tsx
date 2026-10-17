import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "词尺 · 词汇量测试",
    template: "%s · 词尺",
  },
  description:
    "仿墨墨背单词的自适应英语词汇量测试：30 道四选一，按作答实时调整难度，给出带置信区间的词汇量与等级对照。",
  keywords: ["词汇量测试", "英语单词", "背单词", "四级", "六级", "考研", "托福", "雅思", "GRE"],
  applicationName: "词尺",
  openGraph: {
    title: "词尺 · 词汇量测试",
    description: "30 道自适应四选一，量出你的真实词汇量。",
    type: "website",
    locale: "zh_CN",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3eee3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
