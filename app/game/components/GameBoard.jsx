import { BankPanel } from "./BankPanel";
import { CardRow } from "./CardRow";
import { NobleCard } from "./NobleCard";
import { PlayerPanel } from "./PlayerPanel";

export function GameBoard({
  activePlayerId,
  canTakeNoble,
  currentDeviceId,
  history,
  notice,
  onCardClick,
  onChipClick,
  onCollectChips,
  onCollectNoble,
  onEndTurn,
  onUndo,
  players,
  selectedChips,
  shouldEndTurn,
  table,
  turnActions,
  undoEnabled,
}) {
  return (
    <div className="game-layout">
      <section className="table-area" aria-label="Splendor table">
        <div className="table-top">
          <BankPanel
            bank={table.bank}
            collectDisabled={turnActions.main}
            onChipClick={onChipClick}
            onCollect={onCollectChips}
            selectedChips={selectedChips}
          />
          <div className="noble-strip">
            {table.nobles.map((noble, index) => (
              <NobleCard
                canCollect={!turnActions.noble && canTakeNoble(noble)}
                index={index}
                key={noble.id}
                noble={noble}
                onClick={() => onCollectNoble(noble)}
              />
            ))}
          </div>
        </div>

        <div className="market-rows">
          {table.rows.map((row) => (
            <CardRow key={row.level} onCardClick={onCardClick} row={row} />
          ))}
        </div>

        {table.reserved.length ? (
          <section className="reserved-row" aria-label="Reserved cards">
            <div className="row-label">Reserved</div>
            <div className="row-cards">
              {table.reserved.map((card) => (
                <CardRow.ReservedCard
                  activePlayerId={activePlayerId}
                  card={card}
                  key={card.id}
                  onCardClick={onCardClick}
                />
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <div className="side-area">
        <section className="history-panel" aria-label="History">
          <div className="panel-heading">
            <div className="panel-title">History</div>
            <div className="history-actions">
              <button className="small-button" disabled={!undoEnabled} type="button" onClick={onUndo}>
                Undo
              </button>
              <button className={`small-button${shouldEndTurn ? " end-turn-ready" : ""}`} type="button" onClick={onEndTurn}>
                End Turn
              </button>
            </div>
          </div>
          {notice ? <div className="notice-line">{notice}</div> : null}
          <div className="history-list">
            {history.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
        </section>
        {players.map((player) => (
          <PlayerPanel
            isActive={player.id === activePlayerId}
            isOwned={Boolean(currentDeviceId && player.ownerDeviceId === currentDeviceId)}
            key={player.id}
            player={player}
          />
        ))}
      </div>
    </div>
  );
}
