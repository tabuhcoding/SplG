import { StatsBoard } from "./StatsBoard";

export const metadata = {
  title: "Thống kê bài Splendor",
  description: "Số lá theo cấp và màu thưởng, cùng màu chip chiếm nhiều chi phí nhất.",
};

export default function StatsPage() {
  return <StatsBoard />;
}
