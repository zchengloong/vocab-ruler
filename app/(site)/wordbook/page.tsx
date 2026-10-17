import type { Metadata } from "next";

import { WordbookView } from "@/components/wordbook-view";

export const metadata: Metadata = {
  title: "生词本",
  description: "收藏测试中遇到的生词，支持搜索、朗读与导出 CSV。",
};

export default function WordbookPage() {
  return <WordbookView />;
}
