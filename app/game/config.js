export const GEM_ORDER = ["black", "blue", "white", "green", "red"];
export const CHIP_ORDER = ["black", "blue", "white", "green", "red", "yellow"];
export const LEVELS = [3, 2, 1];

export const BASE_SIZES = {
  cardWidth: 128,
  cardHeight: 178,
  nobleSize: 128,
  chipSize: 56,
};

export const GEM_LABELS = {
  black: "Đen",
  blue: "Lam",
  white: "Trắng",
  green: "Lục",
  red: "Đỏ",
  yellow: "Vàng",
};

/** Single letter used in compact history lines. Must stay unique per color. */
export const GEM_SHORT = {
  black: "Đ",
  blue: "L",
  white: "T",
  green: "X",
  red: "R",
  yellow: "V",
};

export const GEM_HEX = {
  black: "#3a3742",
  blue: "#2f6fd0",
  white: "#cfc9b8",
  green: "#1f9d63",
  red: "#d2453f",
  yellow: "#e0ad2b",
};

/** Accent per seat, so players tell each other apart at a glance. */
export const SEAT_COLORS = ["#e0742b", "#2f6fd0", "#1f9d63", "#b8459c", "#d2453f"];

export function seatColor(index) {
  return SEAT_COLORS[index % SEAT_COLORS.length];
}
