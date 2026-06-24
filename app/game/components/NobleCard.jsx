import { spritePosition } from "../sprite";
import { CostList } from "./CostList";

export function NobleCard({ canCollect = false, noble, index, onClick }) {
  return (
    <button
      className={`noble-card${canCollect ? " noble-card-ready" : ""}`}
      disabled={!canCollect}
      onClick={onClick}
      style={{ backgroundPosition: spritePosition(index, 10) }}
      title={noble.id}
      type="button"
    >
      {noble.points > 0 ? <div className="noble-points">{noble.points}</div> : null}
      <CostList cost={noble.cost} />
      {canCollect ? <span className="collect-badge">Collect</span> : null}
    </button>
  );
}
