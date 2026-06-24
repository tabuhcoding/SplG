import { CHIP_ORDER, GEM_LABELS } from "../config";
import { spritePosition } from "../sprite";

export function ChipStack({ color, count, compact = false, onClick, selectedCount = 0 }) {
  const index = Math.max(0, CHIP_ORDER.indexOf(color));

  return (
    <button
      aria-label={`${GEM_LABELS[color] ?? color}: ${count}`}
      className={`chip-stack ${compact ? "chip-stack-compact" : ""} ${
        selectedCount === 1 ? "chip-selected-one" : ""
      } ${selectedCount === 2 ? "chip-selected-two" : ""}`}
      disabled={color === "yellow" && !compact}
      onClick={onClick}
      type="button"
    >
      <span
        className="chip-sprite"
        style={{ backgroundPosition: spritePosition(index, CHIP_ORDER.length) }}
      />
      <strong>{count}</strong>
      {selectedCount > 0 ? <em>+{selectedCount}</em> : null}
    </button>
  );
}
