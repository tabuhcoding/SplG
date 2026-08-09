import { seatColor } from "../config";
import { cardStatus, costBreakdown } from "../engine";
import { DevelopmentCard } from "./DevelopmentCard";

/** Groups the face-up held cards by owner so it is obvious whose pile is whose. */
function groupByOwner(reserved, players) {
  const groups = [];

  for (const card of reserved) {
    let group = groups.find((item) => item.ownerId === card.ownerId);
    if (!group) {
      const seat = players.findIndex((player) => player.id === card.ownerId);
      group = {
        ownerId: card.ownerId,
        name: card.ownerName,
        seat: seat < 0 ? 0 : seat,
        cards: [],
      };
      groups.push(group);
    }
    group.cards.push(card);
  }

  return groups;
}

export function ReservedStrip({ activePlayerId, onCardClick, players, reserved, selectedCardId, viewer }) {
  const groups = groupByOwner(reserved, players);

  return (
    <section className="reserved" aria-label="Thẻ đang giữ">
      <div className="reserved-label">Đang giữ</div>
      <div className="reserved-groups">
        {groups.map((group) => {
          const isMine = group.ownerId === activePlayerId;

          return (
            <div
              className={`reserved-group${isMine ? " reserved-group-mine" : ""}`}
              key={group.ownerId}
              style={{ "--seat": seatColor(group.seat) }}
            >
              <div className="reserved-who">
                <div className="reserved-who-name">
                  <span className="seat-dot" />
                  <strong title={group.name}>{group.name}</strong>
                </div>
                <span>
                  {group.cards.length} thẻ{isMine ? " · của bạn" : ""}
                </span>
              </div>
              <div className="reserved-cards">
                {group.cards.map((card) => (
                  <DevelopmentCard
                    breakdown={viewer ? costBreakdown(viewer, card) : null}
                    card={card}
                    key={card.id}
                    onClick={() => onCardClick({ card, source: "reserved" })}
                    selected={selectedCardId === card.id}
                    status={isMine && viewer ? cardStatus(viewer, card) : null}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
