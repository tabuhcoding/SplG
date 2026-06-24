import { spritePosition } from "../sprite";

export function DeckBack({ level }) {
  return (
    <article
      className="deck-back"
      style={{ backgroundPosition: spritePosition(level - 1, 3) }}
      title={`Deck level ${level}`}
    />
  );
}
