import { GEM_ORDER } from "../game/config";

/** Printed color wheel: each level-3 card leans on the previous color. */
export const WHEEL = ["white", "blue", "green", "red", "black"];

export const GEM_STONE = {
  white: "kim cương",
  blue: "sapphire",
  green: "emerald",
  red: "ruby",
  black: "onyx",
};

export function previousOnWheel(color) {
  const index = WHEEL.indexOf(color);
  return WHEEL[(index + WHEEL.length - 1) % WHEEL.length];
}

function emptyCounts() {
  return Object.fromEntries(GEM_ORDER.map((color) => [color, 0]));
}

export function deckSlice(cards, level) {
  return level ? cards.filter((card) => card.level === level) : cards;
}

export function costTotal(card) {
  return GEM_ORDER.reduce((total, color) => total + (card.cost[color] ?? 0), 0);
}

/**
 * Cost pressure of one bonus color.
 * `pips` is how many gems of each color the cards demand.
 * `freq` is how many of those cards list that color at least once.
 */
export function bonusProfile(cards, level, bonus) {
  const mine = deckSlice(cards, level).filter((card) => card.color === bonus);
  const pips = emptyCounts();
  const freq = emptyCounts();
  let total = 0;

  for (const card of mine) {
    for (const color of GEM_ORDER) {
      const amount = card.cost[color] ?? 0;
      pips[color] += amount;
      total += amount;
      if (amount > 0) freq[color] += 1;
    }
  }

  const peak = Math.max(0, ...GEM_ORDER.map((color) => pips[color]));
  const leaders = GEM_ORDER.filter((color) => pips[color] === peak && peak > 0).sort(
    (a, b) => freq[b] - freq[a] || WHEEL.indexOf(a) - WHEEL.indexOf(b),
  );

  return { bonus, count: mine.length, pips, freq, total, peak, leaders };
}

export function levelSummary(cards, level) {
  const subset = deckSlice(cards, level);
  const profiles = WHEEL.map((bonus) => bonusProfile(cards, level, bonus));
  const demanded = emptyCounts();
  for (const profile of profiles) {
    for (const color of GEM_ORDER) demanded[color] += profile.pips[color];
  }

  const points = {};
  for (const card of subset) points[card.points] = (points[card.points] ?? 0) + 1;

  return {
    level,
    count: subset.length,
    profiles,
    demanded,
    points,
  };
}

export function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((100 * part) / whole);
}

export function nobleRequirements(noble) {
  return WHEEL.filter((color) => (noble.cost[color] ?? 0) > 0).map((color) => ({
    color,
    count: noble.cost[color],
  }));
}

/**
 * Expected gem spend to buy the level-1 cards a noble requires.
 * Each required bonus contributes `count * (that color's average level-1 cost)`.
 */
export function nobleChipPlan(cards, noble, level = 1) {
  const requirements = nobleRequirements(noble);
  const pressure = emptyCounts();
  const feeds = requirements.map(({ color, count }) => {
    const profile = bonusProfile(cards, level, color);
    for (const chip of GEM_ORDER) pressure[chip] += (count * profile.pips[chip]) / profile.count;
    return { color, count, leaders: profile.leaders, profile };
  });
  const ranked = GEM_ORDER.slice().sort(
    (a, b) => pressure[b] - pressure[a] || WHEEL.indexOf(a) - WHEEL.indexOf(b),
  );
  return { requirements, pressure, ranked, feeds, level };
}

/** Other nobles, measured by bonuses still missing after this noble is already met. */
export function nobleNeighbors(nobles, noble) {
  return nobles
    .filter((other) => other.id !== noble.id)
    .map((other) => {
      const missing = WHEEL.filter((color) => (other.cost[color] ?? 0) > (noble.cost[color] ?? 0)).map((color) => ({
        color,
        count: other.cost[color] - (noble.cost[color] ?? 0),
      }));
      return {
        noble: other,
        missing,
        total: missing.reduce((sum, item) => sum + item.count, 0),
      };
    })
    .sort(
      (a, b) =>
        a.total - b.total || WHEEL.indexOf(a.missing[0]?.color) - WHEEL.indexOf(b.missing[0]?.color),
    );
}

export function formatAmount(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
