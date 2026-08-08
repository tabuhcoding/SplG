import { spritePosition } from "../sprite";
import { CostList } from "./CostList";

export function NobleCard({ breakdown, canCollect = false, noble, index, onClick, ready = false }) {
  return (
    <button
      className={`noble-card${ready ? " noble-card-ready" : ""}${canCollect ? " noble-card-live" : ""}`}
      disabled={!canCollect}
      onClick={onClick}
      style={{ backgroundPosition: spritePosition(index, 10) }}
      title={`Quý tộc +${noble.points} điểm`}
      type="button"
    >
      {noble.points > 0 ? <div className="noble-points">{noble.points}</div> : null}
      <CostList breakdown={breakdown} cost={noble.cost} />
      {canCollect ? <span className="collect-badge">Rước ngay</span> : null}
    </button>
  );
}
