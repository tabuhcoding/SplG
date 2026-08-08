import { GEM_LABELS } from "../config";
import { ChipSprite } from "./ChipSprite";

/**
 * `blockerFor(color)` returns "" when the chip can be added, otherwise the reason.
 * A chip that is already picked stays clickable so a tap takes it back.
 */
export function BankPanel({ bank, blockerFor, onChipClick, selectedChips }) {
  return (
    <section className="bank" aria-label="Ngân hàng chip">
      <div className="bank-title">Ngân hàng</div>
      <div className="bank-grid">
        {bank.map((chip) => {
          const selected = selectedChips[chip.color] ?? 0;
          const blocker = blockerFor(chip.color);
          const locked = Boolean(blocker) && selected === 0;

          return (
            <button
              aria-label={`${GEM_LABELS[chip.color]}: còn ${chip.count}${selected ? `, đang chọn ${selected}` : ""}`}
              className={[
                "chip-slot",
                selected ? `chip-slot-selected chip-pick-${selected}` : "",
                locked ? "chip-slot-locked" : "",
                chip.count === 0 ? "chip-slot-empty" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={locked}
              key={chip.color}
              onClick={() => onChipClick(chip.color)}
              title={blocker || `${GEM_LABELS[chip.color]} · còn ${chip.count}`}
              type="button"
            >
              <ChipSprite color={chip.color} />
              <b>{chip.count}</b>
              {selected > 0 ? <em>+{selected}</em> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
