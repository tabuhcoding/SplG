import { GEM_ORDER } from "../config";
import { GemSprite } from "./GemSprite";

/**
 * `breakdown` maps a color to how the viewing player would cover it:
 * "bonus" (free from owned cards), "chips" (paid from hand), "short" (cannot cover).
 * Without it the pills render neutral, e.g. while nobody is seated.
 */
export function CostList({ breakdown, cost }) {
  const entries = GEM_ORDER.filter((color) => cost[color] > 0);

  if (entries.length === 0) return null;

  return (
    <div className="cost-list">
      {entries.map((color) => (
        <div className={`cost-pill${breakdown?.[color] ? ` cost-${breakdown[color]}` : ""}`} key={color}>
          <GemSprite color={color} />
          <span>{cost[color]}</span>
        </div>
      ))}
    </div>
  );
}
