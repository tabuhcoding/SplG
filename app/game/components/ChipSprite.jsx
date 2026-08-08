import { CHIP_ORDER } from "../config";
import { spritePosition } from "../sprite";

export function ChipSprite({ className = "", color }) {
  const index = Math.max(0, CHIP_ORDER.indexOf(color));

  return (
    <span
      aria-hidden="true"
      className={`chip-sprite ${className}`}
      style={{ backgroundPosition: spritePosition(index, CHIP_ORDER.length) }}
    />
  );
}
