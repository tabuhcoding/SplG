import { CHIP_ORDER, GEM_ORDER, seatColor } from "../config";
import { chipTotal } from "../engine";
import { ChipSprite } from "./ChipSprite";
import { GemSprite } from "./GemSprite";

export function PlayerPanel({ isActive = false, isOwned = false, maxChips = 10, player, seat = 0 }) {
  const held = chipTotal(player.chips);

  return (
    <section
      aria-label={player.name}
      className={`player${isActive ? " player-active" : ""}${isOwned ? " player-owned" : ""}`}
      style={{ "--seat": seatColor(seat) }}
    >
      <header className="player-head">
        <span className="seat-dot" />
        <div className="player-id">
          <h3>{player.name}</h3>
          <div className="player-tags">
            {isOwned ? <span className="tag tag-own">Bạn</span> : null}
            {isActive ? <span className="tag tag-turn">Đang đi</span> : null}
            <span className={`tag${held >= maxChips ? " tag-warn" : ""}`}>
              {held}/{maxChips} chip
            </span>
            {player.reserved.length ? <span className="tag">{player.reserved.length} giữ</span> : null}
            {player.nobles.length ? <span className="tag">{player.nobles.length} quý tộc</span> : null}
          </div>
        </div>
        <strong className="player-score">{player.score}</strong>
      </header>

      <div className="player-row">
        <span className="player-row-label">Thẻ</span>
        <div className="token-row">
          {GEM_ORDER.map((color) => (
            <div className={`token${player.bonuses[color] ? "" : " token-zero"}`} key={color}>
              <GemSprite color={color} />
              <b>{player.bonuses[color] ?? 0}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="player-row">
        <span className="player-row-label">Chip</span>
        <div className="token-row">
          {CHIP_ORDER.map((color) => (
            <div className={`token${player.chips[color] ? "" : " token-zero"}`} key={color}>
              <ChipSprite color={color} />
              <b>{player.chips[color] ?? 0}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
