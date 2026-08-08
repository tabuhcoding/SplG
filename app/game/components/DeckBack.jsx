import { spritePosition } from "../sprite";

export function DeckBack({ count = 0, level }) {
  return (
    <article
      className={`deck-back${count === 0 ? " deck-empty" : ""}`}
      style={{ backgroundPosition: spritePosition(level - 1, 3) }}
      title={`Bộ bài cấp ${level} · còn ${count} thẻ`}
    >
      <span className="deck-count">{count}</span>
    </article>
  );
}
