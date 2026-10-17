import type { Metadata } from "next";

import { HistoryView } from "@/components/history-view";

export const metadata: Metadata = {
  title: "历史记录",
  description: "查看历次词汇量测试的估算值、置信区间与趋势。",
};

export default function HistoryPage() {
  return <HistoryView />;
}
