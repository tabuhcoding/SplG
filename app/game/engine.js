import cards from "../../json/card.json";
import nobles from "../../json/noble.json";
import { CHIP_ORDER, GEM_ORDER, GEM_SHORT, LEVELS } from "./config";

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
      history: ["Đang chờ người chơi"],
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
    (color) => `${values[color]}${GEM_SHORT[color]}`
  );
  return parts.length ? parts.join(" ") : "không";
}

/**
 * Full purchase breakdown for a card. Gold covers any shortfall, in any amount,
 * exactly like the printed rules — the player never has to nominate a color.
 */
export function canAfford(player, card) {
  const payment = emptyChips();
  const missing = emptyChips(false);
  const bonusUsed = emptyChips(false);
  let goldNeeded = 0;

  for (const color of GEM_ORDER) {
    const cost = card.cost[color] ?? 0;
    const bonus = player.bonuses[color] ?? 0;
    bonusUsed[color] = Math.min(bonus, cost);
    const need = Math.max(0, cost - bonus);
    const paid = Math.min(player.chips[color] ?? 0, need);
    payment[color] = paid;
    missing[color] = need - paid;
    goldNeeded += need - paid;
  }

  const goldAvailable = player.chips.yellow ?? 0;
  const ok = goldNeeded <= goldAvailable;
  if (ok) payment.yellow = goldNeeded;

  return {
    ok,
    payment: ok ? payment : emptyChips(),
    draft: payment,
    bonusUsed,
    missing,
    goldNeeded,
    shortfall: Math.max(0, goldNeeded - goldAvailable),
  };
}

/** Per-color affordability used to tint the cost pills on a card. */
export function costBreakdown(player, card) {
  return GEM_ORDER.reduce((result, color) => {
    const cost = card.cost[color] ?? 0;
    if (cost <= 0) {
      result[color] = null;
      return result;
    }
    const bonus = player.bonuses[color] ?? 0;
    const need = Math.max(0, cost - bonus);
    if (need === 0) result[color] = "bonus";
    else if ((player.chips[color] ?? 0) >= need) result[color] = "chips";
    else result[color] = "short";
    return result;
  }, {});
}

/** "buy" = affordable with chips only, "gold" = needs gold, "short" = cannot buy. */
export function cardStatus(player, card) {
  if (!player || !card) return null;
  const result = canAfford(player, card);
  if (!result.ok) return { state: "short", ...result };
  return { state: result.goldNeeded > 0 ? "gold" : "buy", ...result };
}

export function nobleProgress(player, noble) {
  if (!player || !noble) return { ready: false, breakdown: {} };
  const breakdown = GEM_ORDER.reduce((result, color) => {
    const cost = noble.cost[color] ?? 0;
    result[color] = cost <= 0 ? null : (player.bonuses[color] ?? 0) >= cost ? "bonus" : "short";
    return result;
  }, {});
  return { ready: GEM_ORDER.every((color) => breakdown[color] !== "short"), breakdown };
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
      history: [`${player.name} thắng với ${player.score} điểm`, ...(state.game.history ?? [])].slice(0, 40),
    },
  };
}

export function getActivePlayer(state) {
  return state.players[state.game.activePlayerIndex];
}

function assertPlaying(state) {
  if (state.status !== "playing") {
    throw new Error("Bàn chưa vào ván.");
  }
}

function assertPlayerTurn(state, deviceId, playerId) {
  const activePlayer = getActivePlayer(state);
  if (!activePlayer) throw new Error("Không có người chơi nào đang tới lượt.");
  if (activePlayer.id !== playerId) throw new Error("Chưa tới lượt người chơi này.");
  if (activePlayer.ownerDeviceId && activePlayer.ownerDeviceId !== deviceId) {
    throw new Error("Máy này không điều khiển người đang tới lượt.");
  }
  return activePlayer;
}

export function validateCollect(state, selectedChips, activePlayer) {
  const selectedChipTotal = CHIP_ORDER.reduce((total, color) => total + (selectedChips[color] ?? 0), 0);
  const selectedColors = GEM_ORDER.filter((color) => selectedChips[color] > 0);
  const selectedAmounts = selectedColors.map((color) => selectedChips[color]);
  const availableDifferentColors = GEM_ORDER.filter((color) => bankCount(state.game.table.bank, color) > 0).length;
  const playerTotalAfter = chipTotal(activePlayer.chips) + selectedChipTotal;

  if (selectedChipTotal === 0) throw new Error("Chọn chip trước đã.");
  if (playerTotalAfter > state.game.settings.maxChips) {
    throw new Error(`Quá ${state.game.settings.maxChips} chip trên tay.`);
  }
  if (selectedColors.length > 3 || selectedChipTotal > 3) throw new Error("Lấy tối đa 3 chip.");
  if (selectedAmounts.includes(2) && !(selectedColors.length === 1 && selectedChipTotal === 2)) {
    throw new Error("Lấy 2 chip thì phải cùng màu.");
  }
  if (selectedColors.length > 1 && selectedAmounts.some((amount) => amount !== 1)) {
    throw new Error("Lấy khác màu thì mỗi màu 1 chip.");
  }
  if (selectedChipTotal < Math.min(3, availableDifferentColors) && !(selectedColors.length === 1 && selectedChipTotal === 2)) {
    throw new Error(`Chọn đủ ${Math.min(3, availableDifferentColors)} màu khác nhau, hoặc 2 chip cùng màu.`);
  }
  if (selectedColors.length === 1 && selectedChipTotal === 1 && availableDifferentColors > 1) {
    throw new Error("Không thể lấy đúng 1 chip khi ngân hàng còn nhiều màu.");
  }
}

/** Non-throwing wrapper so the UI can show the rule live while chips are being picked. */
export function describeCollect(state, selectedChips, activePlayer) {
  if (!activePlayer) return { ok: false, message: "" };
  try {
    validateCollect(state, selectedChips, activePlayer);
    return { ok: true, message: "" };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

/** Why a bank chip cannot be added right now — drives the disabled state in the bank. */
export function chipAddBlocker(state, selectedChips, activePlayer, color) {
  if (!activePlayer) return "Chưa tới lượt.";
  if (color === "yellow") return "Chip vàng chỉ nhận khi giữ thẻ.";
  if (bankCount(state.game.table.bank, color) <= 0) return "Ngân hàng hết màu này.";

  const current = selectedChips[color] ?? 0;
  const total = CHIP_ORDER.reduce((sum, item) => sum + (selectedChips[item] ?? 0), 0);
  const colors = GEM_ORDER.filter((item) => (selectedChips[item] ?? 0) > 0);

  if (current >= 2) return "Đã lấy tối đa màu này.";
  if (chipTotal(activePlayer.chips) + total + 1 > state.game.settings.maxChips) return "Sắp quá số chip trên tay.";
  if (current === 0) {
    if (colors.length >= 3) return "Đã chọn đủ 3 màu.";
    if (colors.some((item) => selectedChips[item] >= 2)) return "Đang lấy 2 chip cùng màu.";
    return "";
  }
  if (colors.length > 1) return "Đang lấy 3 màu khác nhau.";
  if (bankCount(state.game.table.bank, color) < 2) return "Ngân hàng không đủ 2 chip màu này.";
  return "";
}

export function joinLobby(state, { deviceId, names = [], settings = DEFAULT_SETTINGS }) {
  if (!deviceId) throw new Error("Thiếu mã thiết bị.");
  if (state.status === "playing") {
    const exists = state.devices.some((device) => device.deviceId === deviceId);
    if (!exists) throw new Error("Bàn đang trong ván, không vào được.");
    return state;
  }

  const trimmedNames = names.map((name) => name.trim()).filter(Boolean).slice(0, 5);
  const currentOthers = state.players.filter((player) => player.ownerDeviceId !== deviceId);
  const currentOwned = state.players.filter((player) => player.ownerDeviceId === deviceId);
  if (currentOthers.length + trimmedNames.length > 5) throw new Error("Bàn tối đa 5 người chơi.");

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
      history: [`${trimmedNames.length} người sẵn sàng`, ...(state.game.history ?? [])].slice(0, 40),
    },
  };
}

export function startPlaying(state, { deviceId }) {
  if (!state.devices.some((device) => device.deviceId === deviceId)) throw new Error("Vào phòng chờ trước khi bắt đầu.");
  if (!state.players.length) throw new Error("Cần ít nhất 1 người chơi.");
  const settings = state.game.settings ?? DEFAULT_SETTINGS;
  return {
    ...state,
    status: "playing",
    game: {
      settings,
      table: makeTable(settings),
      activePlayerIndex: 0,
      history: ["Bắt đầu ván mới"],
      turnActions: { main: false, noble: false },
      undoSnapshot: null,
    },
  };
}

export function applyGameAction(state, { deviceId, playerId, action }) {
  if (action.type === "BACK_TO_LOBBY") {
    if (!state.devices.some((device) => device.deviceId === deviceId)) throw new Error("Chỉ thiết bị trong bàn mới quay lại phòng chờ được.");
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
        history: ["Quay lại phòng chờ"],
        turnActions: { main: false, noble: false },
        undoSnapshot: null,
        winner: null,
      },
    };
  }

  assertPlaying(state);

  if (action.type === "UNDO") {
    const snapshot = state.game.undoSnapshot;
    if (!snapshot) throw new Error("Không có gì để hoàn tác.");
    return {
      ...state,
      players: snapshot.players,
      game: {
        ...snapshot.game,
        history: ["Đã hoàn tác thao tác trước", ...(snapshot.game.history ?? [])].slice(0, 40),
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
    throw new Error("Lượt này đã dùng hành động chính rồi.");
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
    next.game = pushLog(next.game, `${nextActive.name} lấy chip ${formatGems(selectedChips)}`);
    next.game.turnActions.main = true;
    return next;
  }

  if (action.type === "RESERVE_CARD") {
    const selectedCard = action.payload?.selectedCard;
    if (!selectedCard || selectedCard.source !== "market") throw new Error("Chỉ giữ được thẻ đang mở trên bàn.");
    if (bankCount(next.game.table.bank, "yellow") <= 0) throw new Error("Ngân hàng hết chip vàng để giữ thẻ.");
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
    next.game = pushLog(next.game, `${nextActive.name} giữ thẻ ${GEM_SHORT[selectedCard.card.color]} (${selectedCard.card.points}đ) + 1 vàng`);
    next.game.turnActions.main = true;
    return next;
  }

  if (action.type === "COLLECT_CARD") {
    const selectedCard = action.payload?.selectedCard;
    if (!selectedCard) throw new Error("Chọn một thẻ để mua.");
    const card = selectedCard.card;
    if (selectedCard.source === "reserved" && card.ownerId !== nextActive.id) {
      throw new Error("Chỉ chủ thẻ mới mua được thẻ đang giữ.");
    }
    const paymentResult = canAfford(nextActive, card);
    if (!paymentResult.ok) throw new Error("Không đủ chip để mua thẻ này.");
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
    next.game = pushLog(
      next.game,
      `${nextActive.name} mua thẻ ${GEM_SHORT[card.color]} (${card.points}đ) trả ${formatGems(paymentResult.payment)}`
    );
    next.game.turnActions.main = true;
    return finishIfWinner(next, next.players[activeIndex]);
  }

  if (action.type === "COLLECT_NOBLE") {
    if (next.game.turnActions.noble) throw new Error("Lượt này đã rước quý tộc rồi.");
    const noble = action.payload?.noble;
    if (!canTakeNoble(nextActive, noble)) throw new Error("Chưa đủ bonus để rước quý tộc này.");
    next.players[activeIndex] = {
      ...nextActive,
      score: nextActive.score + noble.points,
      nobles: [...nextActive.nobles, noble],
    };
    next.game.table.nobles = next.game.table.nobles.filter((item) => item.id !== noble.id);
    next.game = pushLog(next.game, `${nextActive.name} rước quý tộc (+${noble.points}đ)`);
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

  throw new Error("Hành động không hợp lệ.");
}
