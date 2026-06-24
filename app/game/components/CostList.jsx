import { GEM_ORDER } from "../config";
import { GemSprite } from "./GemSprite";

export function CostList({ cost }) {
  const entries = GEM_ORDER.filter((color) => cost[color] > 0);

  if (entries.length === 0) return null;

  return (
    <div className="cost-list">
      {entries.map((color) => (
        <div className="cost-pill" key={color}>
          <GemSprite color={color} />
          <span>{cost[color]}</span>
        </div>
      ))}
    </div>
  );
}
