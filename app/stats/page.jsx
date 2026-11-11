import { StatsBoard } from "./StatsBoard";

export const metadata = {
  title: "Thống kê bài Splendor",
  description: "Số lá theo cấp, màu chip nên gom, và chip nên giữ khi nhắm từng quý tộc.",
};

export default function StatsPage() {
  return <StatsBoard />;
}
