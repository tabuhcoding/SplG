import { stableArtIndex, spritePosition } from "../sprite";
import { CostList } from "./CostList";
import { GemSprite } from "./GemSprite";

export function DevelopmentCard({ card, disabled = false, onClick }) {
  const artIndex = stableArtIndex(card.id);

  return (
    <button
      className={`development-card color-${card.color}${disabled ? " card-disabled" : ""}`}
      disabled={disabled}
      onClick={onClick}
      style={{ backgroundPosition: spritePosition(artIndex, 15) }}
      title={`${card.id} - level ${card.level}`}
      type="button"
    >
      <div className="card-shade" />
      {card.points > 0 ? <div className="points">{card.points}</div> : null}
      <GemSprite color={card.color} className="bonus-gem" />
      <CostList cost={card.cost} />
    </button>
  );
}
