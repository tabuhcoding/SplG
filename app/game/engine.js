import cards from "../../json/card.json";
import nobles from "../../json/noble.json";
import { CHIP_ORDER, GEM_LABELS, GEM_ORDER, LEVELS } from "./config";

export const DEFAULT_SETTINGS = {
  chipCount: 7,
  maxChips: 10,
  targetScore: 15,
};

export function emptyChips(includeGold = true) {
  return (includeGold ? CHIP_ORDER : GEM_ORDER).reduce((values, color) => {
    values[color] = 0;
    return values;
  }, {});
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function makePlayer(index, name, ownerDeviceId = "") {
  return {
    id: `player-${index + 1}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: name || `user ${index + 1}`,
    ownerDeviceId,
    score: 0,
    chips: emptyChips(),
    bonuses: emptyChips(false),
    reserved: [],
    nobles: [],
  };
}

export function makeTable(settings = DEFAULT_SETTINGS) {
  const decks = LEVELS.reduce((values, level) => {
    values[level] = shuffle(cards.filter((card) => card.level === level));
    return values;
  }, {});

  return {
    bank: CHIP_ORDER.map((color) => ({
      color,
      count: color === "yellow" ? 5 : settings.chipCount,
    })),
    nobles: shuffle(nobles).slice(0, 4),
    rows: LEVELS.map((level) => ({
      level,
      deck: decks[level].slice(4),
      cards: decks[level].slice(0, 4),
    })),
    reserved: [],
  };
}

export function createEmptyTableState() {
  return {
    status: "lobby",
    devices: [],
    players: [],
    game: {
      settings: DEFAULT_SETTINGS,
      table: { bank: [], nobles: [], rows: [], reserved: [] },
      activePlayerIndex: 0,
      history: ["Waiting for players"],
      turnActions: { main: false, noble: false },
      undoSnapshot: null,
    },
  };
}

export function bankCount(bank, color) {
  return bank.find((chip) => chip.color === color)?.count ?? 0;
}

export function chipTotal(chips) {
  return CHIP_ORDER.reduce((total, color) => total + (chips[color] ?? 0), 0);
}

export function formatGems(values) {
  const parts = CHIP_ORDER.filter((color) => values[color] > 0).map(
    (color) => `${values[color]}${GEM_LABELS[color][0]}`
  );
  return parts.length ? parts.join(", ") : "none";
}

export function canAfford(player, card, goldColor = "") {
  let goldUsed = 0;
  const payment = emptyChips();

  for (const color of GEM_ORDER) {
    const bonusDiscount = player.bonuses[color] ?? 0;
    const costAfterBonus = Math.max(0, (card.cost[color] ?? 0) - bonusDiscount);
    const regular = Math.min(player.chips[color] ?? 0, costAfterBonus);
    payment[color] = regular;
    const missing = costAfterBonus - regular;

    if (missing > 0) {
      if (missing === 1 && goldColor === color && (player.chips.yellow ?? 0) > 0 && goldUsed === 0) {
        payment.yellow = 1;
        goldUsed = 1;
      } else {
        return { ok: false, payment: emptyChips() };
      }
    }
  }

  return { ok: true, payment };
}

export function canTakeNoble(player, noble) {
  if (!player || !noble) return false;
  return GEM_ORDER.every((color) => (player.bonuses[color] ?? 0) >= (noble.cost[color] ?? 0));
}

export function replaceMarketCard(table, level, cardId) {
  return {
    ...table,
    rows: table.rows.map((row) => {
      if (row.level !== level) return row;
      const [nextCard, ...nextDeck] = row.deck;
      return {
        ...row,
        cards: row.cards.map((card) => (card.id === cardId ? nextCard : card)).filter(Boolean),
        deck: nextDeck,
      };
    }),
  };
}

function pushLog(game, message) {
  return {
    ...game,
    history: [message, ...(game.history ?? [])].slice(0, 40),
  };
}

function captureUndo(state) {
  return {
    players: state.players,
    game: {
      ...state.game,
      undoSnapshot: null,
    },
  };
}

function finishIfWinner(state, player) {
  const targetScore = state.game.settings?.targetScore ?? DEFAULT_SETTINGS.targetScore;
  if (!player || player.score < targetScore) return state;
  return {
    ...state,
    status: "finished",
    game: {
      ...state.game,
      winner: {
        id: player.id,
        name: player.name,
        score: player.score,
      },
      history: [`${player.name} wins with ${player.score} points`, ...(state.game.history ?? [])].slice(0, 40),
    },
  };
}

export function getActivePlayer(state) {
  return state.players[state.game.activePlayerIndex];
}

function assertPlaying(state) {
  if (state.status !== "playing") {
    throw new Error("The table is not playing.");
  }
}

function assertPlayerTurn(state, deviceId, playerId) {
  const activePlayer = getActivePlayer(state);
  if (!activePlayer) throw new Error("No active player.");
  if (activePlayer.id !== playerId) throw new Error("It is not this player's turn.");
  if (activePlayer.ownerDeviceId && activePlayer.ownerDeviceId !== deviceId) {
    throw new Error("This device does not control the active player.");
  }
  return activePlayer;
}

function validateCollect(state, selectedChips, activePlayer) {
  const selectedChipTotal = CHIP_ORDER.reduce((total, color) => total + (selectedChips[color] ?? 0), 0);
  const selectedColors = GEM_ORDER.filter((color) => selectedChips[color] > 0);
  const selectedAmounts = selectedColors.map((color) => selectedChips[color]);
  const availableDifferentColors = GEM_ORDER.filter((color) => bankCount(state.game.table.bank, color) > 0).length;
  const playerTotalAfter = chipTotal(activePlayer.chips) + selectedChipTotal;

  if (selectedChipTotal === 0) throw new Error("No chips selected.");
  if (playerTotalAfter > state.game.settings.maxChips) {
    throw new Error(`Max ${state.game.settings.maxChips} chips in hand exceeded.`);
  }
  if (selectedColors.length > 3 || selectedChipTotal > 3) throw new Error("Collect at most 3 chips.");
  if (selectedAmounts.includes(2) && !(selectedColors.length === 1 && selectedChipTotal === 2)) {
    throw new Error("Take 2 only when both chips have the same color.");
  }
  if (selectedColors.length > 1 && selectedAmounts.some((amount) => amount !== 1)) {
    throw new Error("Different-color collect allows 1 chip per color.");
  }
  if (selectedChipTotal < Math.min(3, availableDifferentColors) && !(selectedColors.length === 1 && selectedChipTotal === 2)) {
    throw new Error("Take 3 different colors if the bank has enough colors.");
  }
  if (selectedColors.length === 1 && selectedChipTotal === 1 && availableDifferentColors > 1) {
    throw new Error("Cannot take only 1 chip while the bank has multiple colors.");
  }
}

export function joinLobby(state, { deviceId, names = [], settings = DEFAULT_SETTINGS }) {
  if (!deviceId) throw new Error("Missing device id.");
  if (state.status === "playing") {
    const exists = state.devices.some((device) => device.deviceId === deviceId);
    if (!exists) throw new Error("The table is already playing.");
    return state;
  }

  const trimmedNames = names.map((name) => name.trim()).filter(Boolean).slice(0, 5);
  const currentOthers = state.players.filter((player) => player.ownerDeviceId !== deviceId);
  const currentOwned = state.players.filter((player) => player.ownerDeviceId === deviceId);
  if (currentOthers.length + trimmedNames.length > 5) throw new Error("The table supports at most 5 players.");

  const startIndex = currentOthers.length;
  const ownedPlayers = trimmedNames.map((name, index) => {
    const current = currentOwned[index];
    return current ? { ...current, name } : makePlayer(startIndex + index, name, deviceId);
  });
  const previousDevice = state.devices.find((item) => item.deviceId === deviceId);
  const device = {
    deviceId,
    name: previousDevice?.name ?? `Device ${state.devices.length + 1}`,
    seats: ownedPlayers.map((player) => player.id),
    joinedAt: previousDevice?.joinedAt ?? new Date().toISOString(),
  };

  return {
    ...state,
    status: "lobby",
    devices: [...state.devices.filter((item) => item.deviceId !== deviceId), device],
    players: [...currentOthers, ...ownedPlayers],
    game: {
      ...state.game,
      settings: settings ?? state.game.settings ?? DEFAULT_SETTINGS,
      history: [`${trimmedNames.length} player(s) ready`, ...(state.game.history ?? [])].slice(0, 40),
    },
  };
}

export function startPlaying(state, { deviceId }) {
  if (!state.devices.some((device) => device.deviceId === deviceId)) throw new Error("Join the lobby before starting.");
  if (!state.players.length) throw new Error("Add at least 1 player.");
  const settings = state.game.settings ?? DEFAULT_SETTINGS;
  return {
    ...state,
    status: "playing",
    game: {
      settings,
      table: makeTable(settings),
      activePlayerIndex: 0,
      history: ["Game started"],
      turnActions: { main: false, noble: false },
      undoSnapshot: null,
    },
  };
}

export function applyGameAction(state, { deviceId, playerId, action }) {
  if (action.type === "BACK_TO_LOBBY") {
    if (!state.devices.some((device) => device.deviceId === deviceId)) throw new Error("Only table devices can return to lobby.");
    const lobbyPlayers = state.players.map((player, index) => makePlayer(index, player.name, player.ownerDeviceId));
    return {
      ...state,
      status: "lobby",
      devices: state.devices.map((device) => ({
        ...device,
        seats: lobbyPlayers.filter((player) => player.ownerDeviceId === device.deviceId).map((player) => player.id),
      })),
      players: lobbyPlayers,
      game: {
        ...state.game,
        table: { bank: [], nobles: [], rows: [], reserved: [] },
        activePlayerIndex: 0,
        history: ["Back to lobby"],
        turnActions: { main: false, noble: false },
        undoSnapshot: null,
        winner: null,
      },
    };
  }

  assertPlaying(state);

  if (action.type === "UNDO") {
    const snapshot = state.game.undoSnapshot;
    if (!snapshot) throw new Error("Nothing to undo.");
    return {
      ...state,
      players: snapshot.players,
      game: {
        ...snapshot.game,
        history: ["Last action undone.", ...(snapshot.game.history ?? [])].slice(0, 40),
      },
    };
  }

  const activePlayer = assertPlayerTurn(state, deviceId, playerId);
  let next = {
    ...state,
    players: state.players.map((player) => ({ ...player })),
    game: {
      ...state.game,
      table: {
        ...state.game.table,
        bank: state.game.table.bank.map((chip) => ({ ...chip })),
        rows: state.game.table.rows.map((row) => ({ ...row, cards: [...row.cards], deck: [...row.deck] })),
        nobles: [...state.game.table.nobles],
        reserved: [...state.game.table.reserved],
      },
      turnActions: { ...state.game.turnActions },
      undoSnapshot: captureUndo(state),
    },
  };

  const activeIndex = next.game.activePlayerIndex;
  const nextActive = next.players[activeIndex];

  if (action.type !== "END_TURN" && action.type !== "COLLECT_NOBLE" && next.game.turnActions.main) {
    throw new Error("Main action already used this turn.");
  }

  if (action.type === "COLLECT_CHIPS") {
    const selectedChips = action.payload?.selectedChips ?? emptyChips();
    validateCollect(next, selectedChips, nextActive);
    next.players[activeIndex] = {
      ...nextActive,
      chips: CHIP_ORDER.reduce(
        (chips, color) => ({ ...chips, [color]: (chips[color] ?? 0) + (selectedChips[color] ?? 0) }),
        nextActive.chips
      ),
    };
    next.game.table.bank = next.game.table.bank.map((chip) => ({
      ...chip,
      count: chip.count - (selectedChips[chip.color] ?? 0),
    }));
    next.game = pushLog(next.game, `${nextActive.name} Collect ${formatGems(selectedChips)}`);
    next.game.turnActions.main = true;
    return next;
  }

  if (action.type === "RESERVE_CARD") {
    const selectedCard = action.payload?.selectedCard;
    if (!selectedCard || selectedCard.source !== "market") throw new Error("Select a market card to reserve.");
    if (bankCount(next.game.table.bank, "yellow") <= 0) throw new Error("The bank has no gold chips left for reserve.");
    const reservedCard = { ...selectedCard.card, ownerId: nextActive.id, ownerName: nextActive.name };
    next.players[activeIndex] = {
      ...nextActive,
      chips: { ...nextActive.chips, yellow: nextActive.chips.yellow + 1 },
      reserved: [...nextActive.reserved, reservedCard],
    };
    next.game.table = {
      ...replaceMarketCard(next.game.table, selectedCard.card.level, selectedCard.card.id),
      bank: next.game.table.bank.map((chip) => (chip.color === "yellow" ? { ...chip, count: chip.count - 1 } : chip)),
      reserved: [...next.game.table.reserved, reservedCard],
    };
    next.game = pushLog(next.game, `${nextActive.name} Preorder Chip ${selectedCard.card.color} Point ${selectedCard.card.points}`);
    next.game.turnActions.main = true;
    return next;
  }

  if (action.type === "COLLECT_CARD") {
    const selectedCard = action.payload?.selectedCard;
    const goldColor = action.payload?.goldColor ?? "";
    if (!selectedCard) throw new Error("Select a card to collect.");
    const card = selectedCard.card;
    if (selectedCard.source === "reserved" && card.ownerId !== nextActive.id) {
      throw new Error("Only the owner can collect this reserved card.");
    }
    const paymentResult = canAfford(nextActive, card, goldColor);
    if (!paymentResult.ok) throw new Error("Failed to collect: not enough chips.");
    const nextChips = { ...nextActive.chips };
    CHIP_ORDER.forEach((color) => {
      nextChips[color] -= paymentResult.payment[color] ?? 0;
    });
    next.players[activeIndex] = {
      ...nextActive,
      score: nextActive.score + (card.points ?? 0),
      chips: nextChips,
      bonuses: { ...nextActive.bonuses, [card.color]: (nextActive.bonuses[card.color] ?? 0) + 1 },
      reserved: nextActive.reserved.filter((reservedCard) => reservedCard.id !== card.id),
    };
    const paidBank = {
      ...next.game.table,
      bank: next.game.table.bank.map((chip) => ({ ...chip, count: chip.count + (paymentResult.payment[chip.color] ?? 0) })),
      reserved: next.game.table.reserved.filter((reservedCard) => reservedCard.id !== card.id),
    };
    next.game.table = selectedCard.source === "market" ? replaceMarketCard(paidBank, card.level, card.id) : paidBank;
    next.game = pushLog(next.game, `${nextActive.name} Collect Chip ${card.color} Point ${card.points} By ${formatGems(paymentResult.payment)}`);
    next.game.turnActions.main = true;
    return finishIfWinner(next, next.players[activeIndex]);
  }

  if (action.type === "COLLECT_NOBLE") {
    if (next.game.turnActions.noble) throw new Error("Noble action already used this turn.");
    const noble = action.payload?.noble;
    if (!canTakeNoble(nextActive, noble)) throw new Error("Not enough bonuses to collect this noble.");
    next.players[activeIndex] = {
      ...nextActive,
      score: nextActive.score + noble.points,
      nobles: [...nextActive.nobles, noble],
    };
    next.game.table.nobles = next.game.table.nobles.filter((item) => item.id !== noble.id);
    next.game = pushLog(next.game, `${nextActive.name} Add Noble Point ${noble.points} By ${formatGems(noble.cost)}`);
    next.game.turnActions.noble = true;
    return finishIfWinner(next, next.players[activeIndex]);
  }

  if (action.type === "END_TURN") {
    next.game = {
      ...next.game,
      activePlayerIndex: (next.game.activePlayerIndex + 1) % next.players.length,
      turnActions: { main: false, noble: false },
      undoSnapshot: null,
    };
    return next;
  }

  throw new Error("Unknown game action.");
}
