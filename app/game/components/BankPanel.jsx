import { ChipStack } from "./ChipStack";

export function BankPanel({ bank, collectDisabled = false, onChipClick, onCollect, selectedChips }) {
  return (
    <aside className="bank-panel" aria-label="Token bank">
      <div className="panel-heading">
        <div className="panel-title">Bank</div>
        <button className="small-button" disabled={collectDisabled} type="button" onClick={onCollect}>
          Collect
        </button>
      </div>
      <div className="bank-grid">
        {bank.map((chip) => (
          <ChipStack
            color={chip.color}
            count={chip.count}
            key={chip.color}
            onClick={() => onChipClick(chip.color)}
            selectedCount={selectedChips[chip.color] ?? 0}
          />
        ))}
      </div>
    </aside>
  );
}
