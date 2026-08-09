"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASE_SIZES, CHIP_ORDER, seatColor } from "./config";
import {
  applyGameAction,
  bankCount,
  canTakeNoble,
  chipAddBlocker,
  createEmptyTableState,
  DEFAULT_SETTINGS,
  describeCollect,
  emptyChips,
  getActivePlayer,
  joinLobby,
  startPlaying,
} from "./engine";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "./supabase";
import { ActionDock } from "./components/ActionDock";
import { CardSheet } from "./components/CardSheet";
import { GameBoard } from "./components/GameBoard";
import { Toast } from "./components/Toast";

function getDeviceId() {
  const key = "splendor_device_id";
  let deviceId = window.localStorage.getItem(key);
  if (!deviceId) {
    deviceId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(key, deviceId);
  }
  document.cookie = `${key}=${deviceId}; path=/; max-age=31536000; samesite=lax`;
  return deviceId;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Không gửi được yêu cầu.");
  return data;
}

const NAME_SYNC_DELAY_MS = 700;
const ZOOM_KEY = "splendor_zoom";
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.25;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Sizes the board so a full row (deck + 4 cards) plus the noble column fits the
 * play area, and on roomy screens the three rows fit the height too. `zoom` is the
 * player's manual nudge on top of that.
 *
 * The measured node is the play area, whose size comes from the layout rather than
 * from the cards inside it — otherwise resizing the cards would feed back into the
 * measurement.
 */
function useBoardScale(zoom, hasReserved) {
  const playRef = useRef(null);
  const [auto, setAuto] = useState(0.86);

  useEffect(() => {
    const node = playRef.current;
    if (!node) return undefined;

    const measure = () => {
      const width = node.clientWidth;
      if (!width) return;
      const gap = 10;
      const wide = window.innerWidth > 860;
      const rowWidth = BASE_SIZES.cardWidth * 5 + (wide ? BASE_SIZES.nobleSize * 0.86 : 0);
      let next = (width - gap * 5) / rowWidth;

      if (wide) {
        const available = window.innerHeight - node.getBoundingClientRect().top - 108;
        // Three market rows, plus the shorter reserved row once someone holds a card.
        const rows = BASE_SIZES.cardHeight * (hasReserved ? 3.72 : 3);
        const chrome = gap * (hasReserved ? 3 : 2) + (hasReserved ? 48 : 0);
        next = Math.min(next, (available - chrome) / rows);
      }

      const clamped = clamp(next, MIN_SCALE, MAX_SCALE);
      setAuto((current) => (Math.abs(current - clamped) > 0.01 ? clamped : current));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [hasReserved]);

  return { playRef, scale: clamp(auto * zoom, 0.55, 1.4) };
}

function SettingsFields({ busy, onChange, settings }) {
  const fields = [
    ["chipCount", "Chip mỗi màu"],
    ["targetScore", "Điểm để thắng"],
    ["maxChips", "Chip tối đa trên tay"],
  ];

  return (
    <div className="field-grid">
      {fields.map(([key, label]) => (
        <label className="field" key={key}>
          <span>{label}</span>
          <input
            disabled={busy}
            inputMode="numeric"
            min="1"
            onChange={(event) => onChange(key, event.target.value)}
            type="number"
            value={settings[key]}
          />
        </label>
      ))}
    </div>
  );
}

function LocalSetupModal({ onStart }) {
  const [names, setNames] = useState(["Người 1", "Người 2"]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: Math.max(1, Number(value) || 1) }));
  };

  return (
    <div className="sheet-backdrop">
      <section className="modal" aria-label="Tạo ván mới">
        <header className="modal-head">
          <h2>Ván Splendor mới</h2>
          <p>Chơi chung một máy — chọn người chơi và luật nhà.</p>
        </header>

        <div className="field">
          <span>Người chơi trên máy này</span>
          <div className="name-grid">
            {names.map((name, index) => (
              <input
                key={index}
                maxLength={8}
                onChange={(event) => {
                  const next = [...names];
                  next[index] = event.target.value;
                  setNames(next);
                }}
                value={name}
              />
            ))}
          </div>
          <div className="row-actions">
            <button
              className="btn btn-quiet"
              disabled={names.length >= 5}
              type="button"
              onClick={() => setNames((value) => [...value, `Người ${value.length + 1}`])}
            >
              Thêm người
            </button>
            <button
              className="btn btn-ghost"
              disabled={names.length <= 1}
              type="button"
              onClick={() => setNames((value) => value.slice(0, -1))}
            >
              Bớt
            </button>
          </div>
        </div>

        <SettingsFields onChange={updateSetting} settings={settings} />

        <button className="btn btn-primary btn-block" type="button" onClick={() => onStart({ names, settings })}>
          Bắt đầu
        </button>
      </section>
    </div>
  );
}

function LobbyScreen({ busy, deviceId, notice, onLobbyChange, onPlay, players, rowVersion, settings }) {
  const ownedPlayers = players.filter((player) => player.ownerDeviceId === deviceId);
  const ownedNames = ownedPlayers.map((player) => player.name);
  const [draftNames, setDraftNames] = useState(ownedNames);
  const [draftSettings, setDraftSettings] = useState(settings);
  const draftSettingsRef = useRef(settings);
  const nameEditingRef = useRef(false);
  const nameSyncSeqRef = useRef(0);
  const nameSyncTimerRef = useRef(null);
  const totalPlayers = players.length;

  useEffect(() => {
    if (nameEditingRef.current) return;
    setDraftNames(ownedNames);
  }, [ownedPlayers.map((player) => `${player.id}:${player.name}`).join("|")]);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings.chipCount, settings.maxChips, settings.targetScore]);

  useEffect(() => {
    draftSettingsRef.current = draftSettings;
  }, [draftSettings]);

  useEffect(() => {
    return () => {
      if (nameSyncTimerRef.current) window.clearTimeout(nameSyncTimerRef.current);
    };
  }, []);

  const publishNames = (names) => {
    if (nameSyncTimerRef.current) window.clearTimeout(nameSyncTimerRef.current);
    nameEditingRef.current = false;
    nameSyncSeqRef.current += 1;
    setDraftNames(names);
    onLobbyChange({
      names: names.map((name, index) => name || `Người ${index + 1}`),
      settings: draftSettings,
    });
  };

  const scheduleNameSync = (names) => {
    setDraftNames(names);
    nameEditingRef.current = true;
    nameSyncSeqRef.current += 1;
    const syncSeq = nameSyncSeqRef.current;

    if (nameSyncTimerRef.current) window.clearTimeout(nameSyncTimerRef.current);
    nameSyncTimerRef.current = window.setTimeout(() => {
      Promise.resolve(
        onLobbyChange({
          names: names.map((name, index) => name || `Người ${index + 1}`),
          settings: draftSettingsRef.current,
        })
      ).finally(() => {
        if (nameSyncSeqRef.current === syncSeq) nameEditingRef.current = false;
      });
    }, NAME_SYNC_DELAY_MS);
  };

  const updateSetting = (key, value) => {
    const nextSettings = { ...draftSettings, [key]: Math.max(1, Number(value) || 1) };
    setDraftSettings(nextSettings);
    onLobbyChange({ names: draftNames, settings: nextSettings });
  };

  return (
    <div className="sheet-backdrop">
      <section className="modal modal-wide" aria-label="Phòng chờ">
        <header className="modal-head">
          <h2>Phòng chờ Splendor</h2>
          <p>{players.length ? `${players.length}/5 người đã vào bàn` : "Chưa có ai vào bàn."}</p>
        </header>
        {notice ? <div className="inline-note">{notice}</div> : null}

        <div className="row-actions">
          <button
            className="btn btn-quiet"
            disabled={busy || totalPlayers >= 5}
            type="button"
            onClick={() => publishNames([...draftNames, `Người ${draftNames.length + 1}`])}
          >
            Thêm người trên máy này
          </button>
          <button
            className="btn btn-ghost"
            disabled={busy || draftNames.length === 0}
            type="button"
            onClick={() => publishNames(draftNames.slice(0, -1))}
          >
            Bớt
          </button>
        </div>

        <div className="lobby-list">
          {players.map((player, index) => {
            const mine = player.ownerDeviceId === deviceId;
            return (
              <div className={`lobby-player${mine ? " lobby-player-mine" : ""}`} key={player.id}>
                <span className="seat-dot" style={{ "--seat": seatColor(index) }} />
                {mine ? (
                  <input
                    maxLength={8}
                    onChange={(event) => {
                      const next = draftNames.map((name, nameIndex) =>
                        ownedPlayers[nameIndex].id === player.id ? event.target.value : name
                      );
                      scheduleNameSync(next);
                    }}
                    value={draftNames[ownedPlayers.findIndex((item) => item.id === player.id)] ?? player.name}
                  />
                ) : (
                  <strong>{player.name}</strong>
                )}
                <span className="lobby-where">{mine ? "Máy này" : "Máy khác"}</span>
              </div>
            );
          })}
        </div>

        <SettingsFields busy={busy} onChange={updateSetting} settings={draftSettings} />

        <button
          className="btn btn-primary btn-block"
          disabled={busy || draftNames.length === 0 || rowVersion == null}
          type="button"
          onClick={onPlay}
        >
          Vào ván
        </button>
      </section>
    </div>
  );
}

function BlockedTable({ notice, onReset }) {
  const [password, setPassword] = useState("");

  return (
    <main className="blocked">
      <section className="modal">
        <header className="modal-head">
          <h2>Bàn đang có ván chạy</h2>
          <p>Máy này không nằm trong bàn hiện tại. Chờ ván kết thúc, hoặc reset bàn.</p>
        </header>
        {notice ? <div className="inline-note">{notice}</div> : null}
        <label className="field">
          <span>Mật khẩu reset</span>
          <input onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
        </label>
        <button className="btn btn-primary btn-block" type="button" onClick={() => onReset(password)}>
          Reset bàn
        </button>
      </section>
    </main>
  );
}

function ResetModal({ busy, notice, onClose, onReset }) {
  const [password, setPassword] = useState("");

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <section className="modal" aria-label="Reset bàn" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>Reset bàn</h2>
          <p>Xoá ván hiện tại của tất cả mọi người.</p>
        </header>
        {notice ? <div className="inline-note">{notice}</div> : null}
        <label className="field">
          <span>Mật khẩu reset</span>
          <input onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
        </label>
        <div className="row-actions row-actions-end">
          <button className="btn btn-ghost" disabled={busy} type="button" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn btn-primary" disabled={busy} type="button" onClick={() => onReset(password)}>
            Reset
          </button>
        </div>
      </section>
    </div>
  );
}

function WinnerModal({ busy, onBackToLobby, winner }) {
  if (!winner) return null;

  return (
    <div className="sheet-backdrop">
      <section className="modal modal-winner" aria-label="Kết quả">
        <div className="winner-crown" aria-hidden="true">
          👑
        </div>
        <h2>{winner.name} thắng!</h2>
        <p>{winner.score} điểm.</p>
        <button className="btn btn-primary btn-block" disabled={busy} type="button" onClick={onBackToLobby}>
          Về phòng chờ
        </button>
      </section>
    </div>
  );
}

export function GameScreen() {
  const onlineEnabled = hasSupabaseConfig();
  const [zoom, setZoom] = useState(1);
  const [deviceId, setDeviceId] = useState("");
  const [rowVersion, setRowVersion] = useState(null);
  const [setupOpen, setSetupOpen] = useState(!onlineEnabled);
  const [resetOpen, setResetOpen] = useState(false);
  const [state, setState] = useState(() => createEmptyTableState());
  const [selectedChips, setSelectedChips] = useState(emptyChips());
  const [selectedCard, setSelectedCard] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const soundReadyRef = useRef(false);
  const lastTurnPlayerRef = useRef("");
  const { playRef, scale } = useBoardScale(zoom, state.game.table.reserved.length > 0);

  const activePlayer = getActivePlayer(state);
  const activeIndex = state.game.activePlayerIndex;
  const controlsActivePlayer = Boolean(
    state.status === "playing" && activePlayer && (!onlineEnabled || activePlayer.ownerDeviceId === deviceId)
  );
  const turnDone = state.status === "playing" && (state.game.turnActions.main || state.game.turnActions.noble);
  const blockedFromPlaying =
    onlineEnabled &&
    state.status === "playing" &&
    deviceId &&
    !state.devices.some((device) => device.deviceId === deviceId);

  /**
   * Whose chips the board hints are drawn for: the player about to move when this
   * device controls them, otherwise this device's own seat so you can plan ahead.
   */
  const viewer = useMemo(() => {
    if (state.status !== "playing") return null;
    if (controlsActivePlayer) return activePlayer;
    const mine = state.players.find((player) => player.ownerDeviceId === deviceId);
    return mine ?? activePlayer ?? null;
  }, [activePlayer, controlsActivePlayer, deviceId, state.players, state.status]);

  const hasSelection = CHIP_ORDER.some((color) => selectedChips[color] > 0);
  const collect = useMemo(
    () => (state.status === "playing" ? describeCollect(state, selectedChips, activePlayer) : { ok: false, message: "" }),
    [activePlayer, selectedChips, state]
  );

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(ZOOM_KEY));
    if (stored >= 0.6 && stored <= 1.4) setZoom(stored);
  }, []);

  const nudgeZoom = (delta) => {
    setZoom((current) => {
      const next = Math.round(clamp(current + delta, 0.6, 1.4) * 100) / 100;
      window.localStorage.setItem(ZOOM_KEY, String(next));
      return next;
    });
  };

  useEffect(() => {
    const unlockSound = () => {
      soundReadyRef.current = true;
    };
    window.addEventListener("pointerdown", unlockSound, { once: true });
    window.addEventListener("keydown", unlockSound, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
    };
  }, []);

  useEffect(() => {
    const activeId = activePlayer?.id ?? "";
    if (!controlsActivePlayer || !activeId || lastTurnPlayerRef.current === activeId) return;
    lastTurnPlayerRef.current = activeId;
    if (!soundReadyRef.current) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audio = new AudioContext();
    const gain = audio.createGain();
    const oscillator = audio.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audio.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.2);
    window.setTimeout(() => audio.close(), 260);
  }, [activePlayer?.id, controlsActivePlayer]);

  useEffect(() => {
    if (!controlsActivePlayer) lastTurnPlayerRef.current = activePlayer?.id ?? "";
  }, [activePlayer?.id, controlsActivePlayer]);

  useEffect(() => {
    if (!onlineEnabled) return undefined;

    const currentDeviceId = getDeviceId();
    setDeviceId(currentDeviceId);

    let mounted = true;
    const applyRow = (row) => {
      setState(row.state);
      setRowVersion(row.version);
      if (row.state.status === "playing") setSetupOpen(false);
    };
    const refreshTable = () => {
      fetch("/api/table")
        .then((response) => response.json())
        .then((data) => {
          if (!mounted) return;
          if (data.error) throw new Error(data.error);
          applyRow(data.row);
        })
        .catch((error) => setNotice(error.message));
    };

    refreshTable();

    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      ?.channel("game-table")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_table", filter: "id=eq.main" },
        (payload) => {
          applyRow(payload.new);
          setSelectedChips(emptyChips());
          setSelectedCard(null);
        }
      )
      .subscribe();
    const poll = window.setInterval(refreshTable, 1500);

    return () => {
      mounted = false;
      window.clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [onlineEnabled]);

  const localStartGame = ({ names, settings }) => {
    const nextState = joinLobby(createEmptyTableState(), { deviceId: "local", names, settings });
    setState(startPlaying(nextState, { deviceId: "local" }));
    setDeviceId("local");
    setSetupOpen(false);
    setNotice("");
  };

  const joinOnlineLobby = async ({ names, settings }) => {
    setBusy(true);
    try {
      const data = await postJson("/api/table/join", { deviceId, names, settings });
      setState(data.row.state);
      setRowVersion(data.row.version);
      setSetupOpen(false);
      setNotice("");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const startOnlineGame = async () => {
    setBusy(true);
    try {
      const data = await postJson("/api/table/start", { deviceId });
      setState(data.row.state);
      setRowVersion(data.row.version);
      setNotice("");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const resetOnlineTable = async (password) => {
    setBusy(true);
    try {
      const data = await postJson("/api/table/reset", { password });
      setState(data.row.state);
      setRowVersion(data.row.version);
      setSetupOpen(false);
      setResetOpen(false);
      setNotice("");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  const dispatchGameAction = async (action) => {
    const actionPlayer = activePlayer ?? state.players[0];
    if (!actionPlayer && action.type !== "BACK_TO_LOBBY") return;
    if (!controlsActivePlayer && action.type !== "UNDO" && action.type !== "BACK_TO_LOBBY") {
      setNotice("Máy này không điều khiển người đang tới lượt.");
      return;
    }

    if (!onlineEnabled) {
      try {
        setState((current) => applyGameAction(current, { deviceId: "local", playerId: actionPlayer?.id, action }));
        setSelectedChips(emptyChips());
        setSelectedCard(null);
        setNotice("");
      } catch (error) {
        setNotice(error.message);
      }
      return;
    }

    setBusy(true);
    try {
      const data = await postJson("/api/table/action", {
        deviceId,
        playerId: actionPlayer?.id,
        version: rowVersion,
        action,
      });
      setState(data.row.state);
      setRowVersion(data.row.version);
      setSelectedChips(emptyChips());
      setSelectedCard(null);
      setNotice("");
    } catch (error) {
      setNotice(error.message);
      fetch("/api/table")
        .then((response) => response.json())
        .then((data) => {
          if (data.row) {
            setState(data.row.state);
            setRowVersion(data.row.version);
          }
        });
    } finally {
      setBusy(false);
    }
  };

  /**
   * Tap adds one chip. Tapping again takes a second of the same color when that is
   * legal (the two-same-color move), otherwise it puts the chip back.
   */
  const toggleChip = (color) => {
    if (!controlsActivePlayer || state.game.turnActions.main) return;
    const current = selectedChips[color] ?? 0;
    const blocker = chipAddBlocker(state, selectedChips, activePlayer, color);

    if (blocker) {
      if (current > 0) {
        setNotice("");
        setSelectedChips((chips) => ({ ...chips, [color]: 0 }));
      } else {
        setNotice(blocker);
      }
      return;
    }

    setNotice("");
    setSelectedChips((chips) => ({ ...chips, [color]: (chips[color] ?? 0) + 1 }));
  };

  const chipBlockerFor = useCallback(
    (color) => {
      if (!controlsActivePlayer) return "Chưa tới lượt máy này.";
      if (state.game.turnActions.main) return "Lượt này đã dùng hành động chính.";
      return chipAddBlocker(state, selectedChips, activePlayer, color);
    },
    [activePlayer, controlsActivePlayer, selectedChips, state]
  );

  const canCollectNoble = (noble) =>
    controlsActivePlayer && !state.game.turnActions.noble && canTakeNoble(activePlayer, noble);

  /** Why the card sheet's buttons are off — shown under them so nobody guesses. */
  const sheetNote = (() => {
    if (!selectedCard) return "";
    if (!controlsActivePlayer) return "Chưa tới lượt máy này — đang xem thôi.";
    if (selectedCard.source === "reserved" && selectedCard.card.ownerId !== activePlayer?.id) {
      return `Thẻ này của ${selectedCard.card.ownerName}, chỉ chủ thẻ mới mua được.`;
    }
    if (state.game.turnActions.main) return "Lượt này đã dùng hành động chính rồi.";
    return "";
  })();

  if (blockedFromPlaying) {
    return <BlockedTable notice={notice} onReset={resetOnlineTable} />;
  }

  const shouldShowLobby = onlineEnabled && state.status !== "playing";
  const playing = state.status === "playing";

  return (
    <main
      className="shell"
      style={{
        "--scale": scale,
        "--card-width": `${BASE_SIZES.cardWidth * scale}px`,
        "--card-height": `${BASE_SIZES.cardHeight * scale}px`,
        "--noble-size": `${BASE_SIZES.nobleSize * scale * 0.86}px`,
        "--chip-size": `${BASE_SIZES.chipSize * scale}px`,
      }}
    >
      <header className="topbar">
        <div className="brand">
          <h1>Splendor</h1>
          <p>
            {state.game.settings.targetScore} điểm · tối đa {state.game.settings.maxChips} chip ·{" "}
            {onlineEnabled ? "nhiều máy" : "một máy"}
          </p>
        </div>

        {playing && activePlayer ? (
          <div
            className={`turn-pill${controlsActivePlayer ? " turn-pill-mine" : ""}`}
            style={{ "--seat": seatColor(activeIndex) }}
          >
            <span className="seat-dot" />
            <span>
              {controlsActivePlayer ? "Lượt của " : "Đang chờ "}
              <strong>{activePlayer.name}</strong>
            </span>
          </div>
        ) : null}

        <div className="topbar-actions">
          <div className="zoom">
            <button aria-label="Thu nhỏ" onClick={() => nudgeZoom(-0.1)} type="button">
              −
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button aria-label="Phóng to" onClick={() => nudgeZoom(0.1)} type="button">
              +
            </button>
          </div>
          {onlineEnabled ? (
            <button className="btn btn-ghost" disabled={busy} type="button" onClick={() => setResetOpen(true)}>
              Reset
            </button>
          ) : (
            <button className="btn btn-ghost" disabled={busy} type="button" onClick={() => setSetupOpen(true)}>
              Ván mới
            </button>
          )}
        </div>
      </header>

      <div className="frame">
        <GameBoard
          activePlayerId={activePlayer?.id}
          canTakeNoble={canCollectNoble}
          chipBlockerFor={chipBlockerFor}
          currentDeviceId={onlineEnabled ? deviceId : ""}
          history={state.game.history}
          maxChips={state.game.settings.maxChips}
          onCardClick={(payload) => {
            setSelectedCard(payload);
            setNotice("");
          }}
          onChipClick={toggleChip}
          onCollectNoble={(noble) => dispatchGameAction({ type: "COLLECT_NOBLE", payload: { noble } })}
          playRef={playRef}
          players={state.players}
          selectedCardId={selectedCard?.card?.id}
          selectedChips={selectedChips}
          table={state.game.table}
          viewer={viewer}
        />
      </div>

      {playing ? (
        <ActionDock
          collect={collect}
          hasSelection={hasSelection}
          onClearChips={() => setSelectedChips(emptyChips())}
          onCollectChips={() => dispatchGameAction({ type: "COLLECT_CHIPS", payload: { selectedChips } })}
          onEndTurn={() => dispatchGameAction({ type: "END_TURN" })}
          onUndo={() => dispatchGameAction({ type: "UNDO" })}
          selectedChips={selectedChips}
          turnDone={turnDone}
          undoEnabled={Boolean(state.game.undoSnapshot)}
          waitingFor={activePlayer?.name}
          yourTurn={controlsActivePlayer}
        />
      ) : null}

      {selectedCard ? (
        <CardSheet
          busy={busy}
          canAct={controlsActivePlayer && !state.game.turnActions.main}
          card={selectedCard.card}
          goldLeft={bankCount(state.game.table.bank, "yellow")}
          isOwner={selectedCard.source !== "reserved" || selectedCard.card.ownerId === activePlayer?.id}
          note={sheetNote}
          onBuy={() => dispatchGameAction({ type: "COLLECT_CARD", payload: { selectedCard } })}
          onClose={() => setSelectedCard(null)}
          onReserve={() => dispatchGameAction({ type: "RESERVE_CARD", payload: { selectedCard } })}
          player={viewer}
          source={selectedCard.source}
        />
      ) : null}

      {!onlineEnabled && setupOpen ? <LocalSetupModal onStart={localStartGame} /> : null}

      {shouldShowLobby ? (
        <LobbyScreen
          busy={busy}
          deviceId={deviceId}
          notice={notice}
          onLobbyChange={joinOnlineLobby}
          onPlay={startOnlineGame}
          players={state.players}
          rowVersion={rowVersion}
          settings={state.game.settings}
        />
      ) : null}

      {resetOpen ? (
        <ResetModal busy={busy} notice={notice} onClose={() => setResetOpen(false)} onReset={resetOnlineTable} />
      ) : null}

      {state.status === "finished" ? (
        <WinnerModal
          busy={busy}
          onBackToLobby={() => dispatchGameAction({ type: "BACK_TO_LOBBY" })}
          winner={state.game.winner}
        />
      ) : null}

      {shouldShowLobby ? null : <Toast message={notice} onDismiss={() => setNotice("")} />}
    </main>
  );
}
