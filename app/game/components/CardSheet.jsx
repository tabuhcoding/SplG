import { GEM_LABELS, GEM_ORDER } from "../config";
import { canAfford, costBreakdown } from "../engine";
import { DevelopmentCard } from "./DevelopmentCard";
import { GemSprite } from "./GemSprite";

/**
 * Detail sheet for a tapped card. Gold is spent automatically for whatever the
 * player is short, so there is nothing to configure before buying.
 */
export function CardSheet({ busy, card, goldLeft = 0, mainUsed, onBuy, onClose, onReserve, player, source }) {
  const result = player ? canAfford(player, card) : null;
  const breakdown = player ? costBreakdown(player, card) : null;
  const rows = GEM_ORDER.filter((color) => (card.cost[color] ?? 0) > 0);
  const canReserve = source === "market" && goldLeft > 0;

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <section
        aria-label="Chi tiết thẻ"
        className="sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="sheet-body">
          <div className="sheet-card">
            <DevelopmentCard breakdown={breakdown} card={card} disabled onClick={() => {}} />
          </div>

          <div className="sheet-info">
            <div className="sheet-title">
              <strong>
                {card.points > 0 ? `+${card.points} điểm` : "Không điểm"} · bonus {GEM_LABELS[card.color]}
              </strong>
              <span>{source === "reserved" ? `Thẻ ${card.ownerName} đang giữ` : `Thẻ cấp ${card.level}`}</span>
            </div>

            <div className="pay-table">
              {rows.map((color) => {
                const cost = card.cost[color] ?? 0;
                const bonus = result ? result.bonusUsed[color] : 0;
                const chips = result ? result.draft[color] : 0;
                const gold = result ? result.missing[color] : 0;

                return (
                  <div className="pay-row" key={color}>
                    <GemSprite color={color} />
                    <b>{cost}</b>
                    <span className="pay-parts">
                      {bonus > 0 ? <i className="part part-bonus">{bonus} thẻ</i> : null}
                      {chips > 0 ? <i className="part part-chip">{chips} chip</i> : null}
                      {gold > 0 ? (
                        <i className={`part ${result.ok ? "part-gold" : "part-short"}`}>
                          {gold} {result.ok ? "vàng" : "thiếu"}
                        </i>
                      ) : null}
                    </span>
                  </div>
                );
              })}
              {rows.length === 0 ? <div className="pay-row pay-free">Thẻ miễn phí</div> : null}
            </div>

            <div className={`sheet-verdict${result?.ok ? " verdict-ok" : " verdict-short"}`}>
              {result?.ok
                ? result.goldNeeded > 0
                  ? `Mua được — dùng thêm ${result.goldNeeded} chip vàng`
                  : "Mua được bằng chip đang có"
                : `Còn thiếu ${result?.shortfall ?? 0} chip`}
            </div>
          </div>
        </div>

        <div className="sheet-actions">
          <button className="btn btn-ghost" onClick={onClose} type="button">
            Đóng
          </button>
          {source === "market" ? (
            <button
              className="btn btn-quiet"
              disabled={mainUsed || busy || !canReserve}
              onClick={onReserve}
              title={canReserve ? "Giữ thẻ và nhận 1 chip vàng" : "Ngân hàng hết chip vàng"}
              type="button"
            >
              Giữ thẻ
            </button>
          ) : null}
          <button className="btn btn-primary" disabled={mainUsed || busy || !result?.ok} onClick={onBuy} type="button">
            Mua thẻ
          </button>
        </div>
        {mainUsed ? <div className="sheet-note">Lượt này đã dùng hành động chính rồi.</div> : null}
      </section>
    </div>
  );
}
