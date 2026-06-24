import cards from "../../json/card.json";
import nobles from "../../json/noble.json";
import { CHIP_ORDER, GEM_ORDER, LEVELS } from "./config";

function cardsForLevel(level) {
  return cards.filter((card) => card.level === level).slice(0, 4);
}

export const tableSetup = {
  nobles: nobles.slice(0, 5),
  rows: LEVELS.map((level) => ({
    level,
    deckCount: cards.filter((card) => card.level === level).length - 4,
    cards: cardsForLevel(level),
  })),
  bank: CHIP_ORDER.map((color) => ({
    color,
    count: color === "yellow" ? 5 : 7,
  })),
};

export const players = [
  {
    id: "player",
    name: "Bạn",
    score: 0,
    chips: { black: 0, blue: 0, white: 0, green: 0, red: 0, yellow: 0 },
    bonuses: { black: 0, blue: 0, white: 0, green: 0, red: 0 },
    reserved: [],
  },
  {
    id: "opponent",
    name: "Đối thủ",
    score: 0,
    chips: { black: 1, blue: 1, white: 0, green: 0, red: 0, yellow: 0 },
    bonuses: { black: 0, blue: 0, white: 0, green: 0, red: 0 },
    reserved: [],
  },
];

export const emptyGemMap = GEM_ORDER.reduce((values, color) => {
  values[color] = 0;
  return values;
}, {});
