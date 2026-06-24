import { CHIP_ORDER, GEM_ORDER } from "../config";
import { ChipStack } from "./ChipStack";
import { GemSprite } from "./GemSprite";

export function PlayerPanel({ isActive = false, isOwned = false, player }) {
  return (
    <section
      className={`player-panel${isActive ? " player-panel-active" : ""}${isOwned ? " player-panel-owned" : ""}`}
      aria-label={player.name}
    >
      <div className="player-summary">
        <div>
          <h2>{player.name}</h2>
          <span>
            {player.reserved.length} reserved · {player.nobles.length} noble
          </span>
        </div>
        <div className="player-score-block">
          {isOwned ? <span className="owned-badge">Mine</span> : null}
          <strong>{player.score}</strong>
        </div>
      </div>

      <div className="player-line">
        <span>Chip</span>
        <div className="mini-chip-row">
          {CHIP_ORDER.map((color) => (
            <ChipStack color={color} compact count={player.chips[color] ?? 0} key={color} />
          ))}
        </div>
      </div>

      <div className="player-line">
        <span>Bonus</span>
        <div className="bonus-row">
          {GEM_ORDER.map((color) => (
            <div className="bonus-item" key={color}>
              <GemSprite color={color} />
              <strong>{player.bonuses[color] ?? 0}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
