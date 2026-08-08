import { nobleProgress } from "../engine";
import { BankPanel } from "./BankPanel";
import { CardRow, ReservedCard } from "./CardRow";
import { HistoryPanel } from "./HistoryPanel";
import { NobleCard } from "./NobleCard";
import { PlayerPanel } from "./PlayerPanel";

export function GameBoard({
  activePlayerId,
  canTakeNoble,
  chipBlockerFor,
  currentDeviceId,
  history,
  maxChips,
  onCardClick,
  onChipClick,
  onCollectNoble,
  playRef,
  players,
  selectedCardId,
  selectedChips,
  table,
  viewer,
}) {
  return (
    <div className="layout">
      <section className="felt" aria-label="Bàn chơi">
        <BankPanel
          bank={table.bank}
          blockerFor={chipBlockerFor}
          onChipClick={onChipClick}
          selectedChips={selectedChips}
        />

        <div className="felt-play" ref={playRef}>
          <div className="felt-inner">
            <div className="market">
              {table.rows.map((row) => (
                <CardRow
                  key={row.level}
                  onCardClick={onCardClick}
                  row={row}
                  selectedCardId={selectedCardId}
                  viewer={viewer}
                />
              ))}

              {table.reserved.length ? (
                <div className="reserved" aria-label="Thẻ đang giữ">
                  <div className="reserved-label">Đang giữ</div>
                  <div className="reserved-cards">
                    {table.reserved.map((card) => (
                      <ReservedCard
                        activePlayerId={activePlayerId}
                        card={card}
                        key={card.id}
                        onCardClick={onCardClick}
                        selectedCardId={selectedCardId}
                        viewer={viewer}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="nobles" aria-label="Quý tộc">
              {table.nobles.map((noble, index) => {
                const progress = nobleProgress(viewer, noble);
                return (
                  <NobleCard
                    breakdown={progress.breakdown}
                    canCollect={canTakeNoble(noble)}
                    index={index}
                    key={noble.id}
                    noble={noble}
                    onClick={() => onCollectNoble(noble)}
                    ready={progress.ready}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <aside className="rail">
        <div className="players">
          {players.map((player, index) => (
            <PlayerPanel
              isActive={player.id === activePlayerId}
              isOwned={Boolean(currentDeviceId && player.ownerDeviceId === currentDeviceId)}
              key={player.id}
              maxChips={maxChips}
              player={player}
              seat={index}
            />
          ))}
        </div>
        <HistoryPanel history={history} />
      </aside>
    </div>
  );
}
