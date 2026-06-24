import { GEM_LABELS, GEM_ORDER } from "../config";
import { gemIndex, spritePosition } from "../sprite";

export function GemSprite({ color, className = "" }) {
  const isGold = color === "yellow";
  const index = isGold ? GEM_ORDER.length - 1 : gemIndex(color);

  return (
    <span
      aria-label={GEM_LABELS[color] ?? color}
      className={`gem-sprite ${isGold ? "gem-gold" : ""} ${className}`}
      style={{
        backgroundPosition: spritePosition(index, GEM_ORDER.length),
      }}
      title={GEM_LABELS[color] ?? color}
    />
  );
}
