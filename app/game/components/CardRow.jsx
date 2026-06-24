import { DeckBack } from "./DeckBack";
import { DevelopmentCard } from "./DevelopmentCard";

export function CardRow({ onCardClick, row }) {
  return (
    <section className="card-row" aria-label={`Level ${row.level}`}>
      <div className="row-cards">
        <DeckBack level={row.level} />
        {row.cards.map((card) => (
          <DevelopmentCard
            card={card}
            key={card.id}
            onClick={() => onCardClick({ card, source: "market" })}
          />
        ))}
      </div>
    </section>
  );
}

function ReservedCard({ activePlayerId, card, onCardClick }) {
  const isOwner = card.ownerId === activePlayerId;

  return (
    <div className="reserved-card-wrap">
      <div className="reserved-owner">{card.ownerName}</div>
      <DevelopmentCard
        card={card}
        disabled={!isOwner}
        onClick={() => {
          if (isOwner) onCardClick({ card, source: "reserved" });
        }}
      />
    </div>
  );
}

CardRow.ReservedCard = ReservedCard;
