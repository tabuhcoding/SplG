import { GEM_LABELS } from "../config";
import { stableArtIndex, spritePosition } from "../sprite";
import { CostList } from "./CostList";
import { GemSprite } from "./GemSprite";

const STATUS_LABEL = {
  buy: "Mua được",
  gold: "Cần vàng",
};

/**
 * `status` comes from engine.cardStatus(): "buy" | "gold" | "short".
 * It drives the ring + badge so a player can read the board without doing the math.
 */
export function DevelopmentCard({ card, breakdown, disabled = false, onClick, selected = false, status }) {
  const artIndex = stableArtIndex(card.id);
  const state = status?.state;

  return (
    <button
      className={[
        "development-card",
        `color-${card.color}`,
        state ? `card-${state}` : "",
        selected ? "card-selected" : "",
        disabled ? "card-disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      onClick={onClick}
      style={{ backgroundPosition: spritePosition(artIndex, 15) }}
      title={`Thẻ ${GEM_LABELS[card.color]} · ${card.points} điểm · cấp ${card.level}`}
      type="button"
    >
      <div className="card-shade" />
      {card.points > 0 ? <div className="points">{card.points}</div> : null}
      <GemSprite color={card.color} className="bonus-gem" />
      <CostList breakdown={breakdown} cost={card.cost} />
      {state && state !== "short" ? <span className={`card-flag flag-${state}`}>{STATUS_LABEL[state]}</span> : null}
      {/* Only flag near-misses; flagging every unaffordable card is just noise. */}
      {state === "short" && status.shortfall > 0 && status.shortfall <= 3 ? (
        <span className="card-flag flag-short">thiếu {status.shortfall}</span>
      ) : null}
    </button>
  );
}
