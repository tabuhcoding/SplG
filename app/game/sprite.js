import { GEM_ORDER } from "./config";

export function spritePosition(index, total) {
  if (total <= 1) return "0% 0%";
  return `${(index / (total - 1)) * 100}% 0%`;
}

export function gemIndex(color) {
  return Math.max(0, GEM_ORDER.indexOf(color));
}

export function stableArtIndex(cardId) {
  const number = Number(String(cardId).replace(/\D/g, "")) || 1;
  return (number * 7 + 3) % 15;
}
