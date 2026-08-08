import { CHIP_ORDER } from "../config";
import { ChipSprite } from "./ChipSprite";

/**
 * The single place every turn action lives: pick-up preview, undo, end turn.
 * Sticks to the bottom of the viewport so it stays reachable by thumb on a phone.
 */
export function ActionDock({
  collect,
  hasSelection,
  onClearChips,
  onCollectChips,
  onEndTurn,
  onUndo,
  selectedChips,
  turnDone,
  undoEnabled,
  waitingFor,
  yourTurn,
}) {
  if (!yourTurn) {
    return (
      <div className="dock dock-waiting">
        <span className="dock-hint">
          <span className="dot-pulse" aria-hidden="true" />
          Đang chờ <strong>{waitingFor || "người chơi khác"}</strong>…
        </span>
        <span className="dock-hint dock-hint-muted">Gợi ý “mua được” đang tính theo bài của bạn.</span>
      </div>
    );
  }

  return (
    <div className={`dock${turnDone ? " dock-ready" : ""}`}>
      <div className="dock-info">
        {hasSelection ? (
          <>
            <button className="dock-picks" onClick={onClearChips} title="Bấm để bỏ chọn hết" type="button">
              {CHIP_ORDER.filter((color) => selectedChips[color] > 0).map((color) => (
                <span className="dock-pick" key={color}>
                  <ChipSprite color={color} />
                  {selectedChips[color] > 1 ? <em>×{selectedChips[color]}</em> : null}
                </span>
              ))}
            </button>
            <span className={`dock-hint${collect.ok ? " dock-hint-ok" : " dock-hint-warn"}`}>
              {collect.ok ? "Hợp lệ — bấm Lấy chip" : collect.message}
            </span>
          </>
        ) : (
          <span className="dock-hint">
            {turnDone ? "Xong hành động — kết thúc lượt nhé." : "Chọn chip ở ngân hàng, hoặc chạm vào một thẻ."}
          </span>
        )}
      </div>

      <div className="dock-actions">
        <button className="btn btn-ghost" disabled={!undoEnabled} onClick={onUndo} type="button">
          Hoàn tác
        </button>
        <button
          className={`btn ${turnDone && !hasSelection ? "btn-primary btn-pulse" : "btn-quiet"}`}
          onClick={onEndTurn}
          type="button"
        >
          Kết thúc lượt
        </button>
        {hasSelection ? (
          <button
            className="btn btn-primary"
            disabled={!collect.ok}
            onClick={onCollectChips}
            title={collect.ok ? "" : collect.message}
            type="button"
          >
            Lấy chip
          </button>
        ) : null}
      </div>
    </div>
  );
}
