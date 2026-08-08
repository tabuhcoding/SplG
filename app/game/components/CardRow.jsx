import { cardStatus, costBreakdown } from "../engine";
import { DeckBack } from "./DeckBack";
import { DevelopmentCard } from "./DevelopmentCard";

/** `viewer` is the player the affordability hints are drawn for (usually whoever is up). */
export function CardRow({ onCardClick, row, selectedCardId, viewer }) {
  return (
    <section className="market-row" aria-label={`Thẻ cấp ${row.level}`}>
      <DeckBack count={row.deck?.length ?? 0} level={row.level} />
      {row.cards.map((card) => (
        <DevelopmentCard
          breakdown={viewer ? costBreakdown(viewer, card) : null}
          card={card}
          key={card.id}
          onClick={() => onCardClick({ card, source: "market" })}
          selected={selectedCardId === card.id}
          status={viewer ? cardStatus(viewer, card) : null}
        />
      ))}
    </section>
  );
}

export function ReservedCard({ activePlayerId, card, onCardClick, selectedCardId, viewer }) {
  const isOwner = card.ownerId === activePlayerId;

  return (
    <div className="reserved-card">
      <span className="reserved-owner">{card.ownerName}</span>
      <DevelopmentCard
        breakdown={viewer ? costBreakdown(viewer, card) : null}
        card={card}
        disabled={!isOwner}
        onClick={() => {
          if (isOwner) onCardClick({ card, source: "reserved" });
        }}
        selected={selectedCardId === card.id}
        status={isOwner && viewer ? cardStatus(viewer, card) : null}
      />
    </div>
  );
}

CardRow.ReservedCard = ReservedCard;
