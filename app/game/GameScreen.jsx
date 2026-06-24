"use client";

import { useEffect, useRef, useState } from "react";
import { BASE_SIZES, CHIP_ORDER, GEM_LABELS, GEM_ORDER } from "./config";
import {
  applyGameAction,
  bankCount,
  canTakeNoble,
  createEmptyTableState,
  DEFAULT_SETTINGS,
  emptyChips,
  getActivePlayer,
  joinLobby,
  startPlaying,
} from "./engine";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "./supabase";
import { GameBoard } from "./components/GameBoard";

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
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function LocalSetupModal({ onStart }) {
  const [names, setNames] = useState(["user 1", "user 2"]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: Math.max(1, Number(value) || 1) }));
  };

  return (
    <div className="setup-backdrop">
      <section className="setup-modal" aria-label="Game setup">
        <div>
          <h2>{mode === "join" ? "Join Splendor Table" : "New Splendor Game"}</h2>
          <p>Choose this device's players and starting limits.</p>
        </div>

        <div className="setup-field">
          <span>Users on this device</span>
          <div className="setup-users">
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
          <div className="setup-actions">
            <button
            disabled={names.length >= 5}
              type="button"
              onClick={() => setNames((value) => [...value, `user ${value.length + 1}`])}
            >
              Add
            </button>
            <button
              disabled={names.length <= 1}
              type="button"
              onClick={() => setNames((value) => value.slice(0, -1))}
            >
              Remove
            </button>
          </div>
        </div>

        <label className="setup-field">
          <span>Chips per color</span>
          <input
            min="1"
            onChange={(event) => updateSetting("chipCount", event.target.value)}
            type="number"
            value={settings.chipCount}
          />
        </label>
        <label className="setup-field">
          <span>Target score</span>
          <input
            min="1"
            onChange={(event) => updateSetting("targetScore", event.target.value)}
            type="number"
            value={settings.targetScore}
          />
        </label>
        <label className="setup-field">
          <span>Max chips in hand</span>
          <input
            min="1"
            onChange={(event) => updateSetting("maxChips", event.target.value)}
            type="number"
            value={settings.maxChips}
          />
        </label>

        <button
          className="primary-button"
          type="button"
          onClick={() => onStart({ names, settings })}
        >
          Start Game
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
  const totalPlayers = players.length;

  useEffect(() => {
    setDraftNames(ownedNames);
  }, [ownedPlayers.map((player) => `${player.id}:${player.name}`).join("|")]);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings.chipCount, settings.maxChips, settings.targetScore]);

  const publishNames = (names) => {
    setDraftNames(names);
    onLobbyChange({
      names: names.map((name, index) => name || `user ${index + 1}`),
      settings: draftSettings,
    });
  };

  const updateSetting = (key, value) => {
    const nextSettings = { ...draftSettings, [key]: Math.max(1, Number(value) || 1) };
    setDraftSettings(nextSettings);
    onLobbyChange({
      names: draftNames,
      settings: nextSettings,
    });
  };

  return (
    <div className="setup-backdrop">
      <section className="setup-modal lobby-modal" aria-label="Game lobby">
        <div>
          <h2>Splendor Lobby</h2>
          <p>{players.length ? `${players.length}/5 players joined` : "No players joined yet."}</p>
        </div>
        {notice ? <div className="notice-line">{notice}</div> : null}

        <div className="setup-actions">
          <button
            disabled={busy || totalPlayers >= 5}
            type="button"
            onClick={() => publishNames([...draftNames, `user ${draftNames.length + 1}`])}
          >
            Add User
          </button>
          <button
            disabled={busy || draftNames.length === 0}
            type="button"
            onClick={() => publishNames(draftNames.slice(0, -1))}
          >
            Remove Mine
          </button>
        </div>

        <div className="lobby-list">
          {players.map((player) => (
            <div className="lobby-player" key={player.id}>
              {player.ownerDeviceId === deviceId ? (
                <input
                  maxLength={8}
                  onChange={(event) => {
                    const next = draftNames.map((name, index) => (ownedPlayers[index].id === player.id ? event.target.value : name));
                    publishNames(next);
                  }}
                  value={draftNames[ownedPlayers.findIndex((item) => item.id === player.id)] ?? player.name}
                />
              ) : (
                <strong>{player.name}</strong>
              )}
              <span>{player.ownerDeviceId === deviceId ? "This device" : "Other device"}</span>
            </div>
          ))}
        </div>

        <div className="lobby-settings">
          <label className="setup-field">
            <span>Chips per color</span>
            <input
              disabled={busy}
              min="1"
              onChange={(event) => updateSetting("chipCount", event.target.value)}
              type="number"
              value={draftSettings.chipCount}
            />
          </label>
          <label className="setup-field">
            <span>Target score</span>
            <input
              disabled={busy}
              min="1"
              onChange={(event) => updateSetting("targetScore", event.target.value)}
              type="number"
              value={draftSettings.targetScore}
            />
          </label>
          <label className="setup-field">
            <span>Max chips in hand</span>
            <input
              disabled={busy}
              min="1"
              onChange={(event) => updateSetting("maxChips", event.target.value)}
              type="number"
              value={draftSettings.maxChips}
            />
          </label>
        </div>

        <div className="setup-actions">
          <button disabled={busy || draftNames.length === 0 || rowVersion == null} type="button" onClick={onPlay}>
            Play
          </button>
        </div>
      </section>
    </div>
  );
}

function BlockedTable({ notice, onReset }) {
  const [password, setPassword] = useState("");

  return (
    <main className="blocked-table">
      <section className="setup-modal">
        <div>
          <h2>Table already playing</h2>
          <p>This device is not part of the current table.</p>
        </div>
        {notice ? <div className="notice-line">{notice}</div> : null}
        <label className="setup-field">
          <span>Reset password</span>
          <input onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
        </label>
        <button className="primary-button" type="button" onClick={() => onReset(password)}>
          Reset Table
        </button>
      </section>
    </main>
  );
}

function ResetModal({ busy, notice, onClose, onReset }) {
  const [password, setPassword] = useState("");

  return (
    <div className="setup-backdrop">
      <section className="setup-modal" aria-label="Reset table">
        <div>
          <h2>Reset Table</h2>
          <p>Reset the current table for everyone.</p>
        </div>
        {notice ? <div className="notice-line">{notice}</div> : null}
        <label className="setup-field">
          <span>Reset password</span>
          <input onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
        </label>
        <div className="setup-actions">
          <button disabled={busy} type="button" onClick={() => onReset(password)}>
            Reset
          </button>
          <button disabled={busy} type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}

function WinnerModal({ busy, onBackToLobby, winner }) {
  if (!winner) return null;

  return (
    <div className="setup-backdrop">
      <section className="setup-modal winner-modal" aria-label="Winner">
        <div>
          <h2>{winner.name} wins</h2>
          <p>{winner.score} points reached.</p>
        </div>
        <button className="primary-button" disabled={busy} type="button" onClick={onBackToLobby}>
          Back to Lobby
        </button>
      </section>
    </div>
  );
}

export function GameScreen() {
  const onlineEnabled = hasSupabaseConfig();
  const [scale, setScale] = useState(0.86);
  const [deviceId, setDeviceId] = useState("");
  const [rowVersion, setRowVersion] = useState(null);
  const [setupOpen, setSetupOpen] = useState(!onlineEnabled);
  const [resetOpen, setResetOpen] = useState(false);
  const [state, setState] = useState(() => createEmptyTableState());
  const [selectedChips, setSelectedChips] = useState(emptyChips());
  const [selectedCard, setSelectedCard] = useState(null);
  const [goldColor, setGoldColor] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const soundReadyRef = useRef(false);
  const lastTurnPlayerRef = useRef("");

  const activePlayer = getActivePlayer(state);
  const controlsActivePlayer = Boolean(
    state.status === "playing" && activePlayer && (!onlineEnabled || activePlayer.ownerDeviceId === deviceId)
  );
  const shouldEndTurn = state.status === "playing" && (state.game.turnActions.main || state.game.turnActions.noble);
  const showYourTurn = controlsActivePlayer;
  const blockedFromPlaying =
    onlineEnabled &&
    state.status === "playing" &&
    deviceId &&
    !state.devices.some((device) => device.deviceId === deviceId);

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
    if (!showYourTurn || !activeId || lastTurnPlayerRef.current === activeId) return;
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
  }, [activePlayer?.id, showYourTurn]);

  useEffect(() => {
    if (!showYourTurn) lastTurnPlayerRef.current = activePlayer?.id ?? "";
  }, [activePlayer?.id, showYourTurn]);

  useEffect(() => {
    if (!onlineEnabled) return;

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
          setGoldColor("");
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
      setNotice("This device does not control the active player.");
      return;
    }

    if (!onlineEnabled) {
      try {
        setState((current) => applyGameAction(current, { deviceId: "local", playerId: actionPlayer?.id, action }));
        setSelectedChips(emptyChips());
        setSelectedCard(null);
        setGoldColor("");
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
      setGoldColor("");
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

  const cycleChipSelection = (color) => {
    if (!controlsActivePlayer || state.game.turnActions.main) return;
    if (color === "yellow" || bankCount(state.game.table.bank, color) <= 0) return;
    setNotice("");
    setSelectedChips((current) => {
      const next = emptyChips();
      const nextCount = ((current[color] ?? 0) + 1) % 3;

      if (nextCount === 2) {
        next[color] = Math.min(2, bankCount(state.game.table.bank, color));
        return next;
      }

      Object.assign(next, current);
      if ((current[color] ?? 0) === 0) {
        const selectedColorCount = GEM_ORDER.filter((gemColor) => current[gemColor] > 0).length;
        if (selectedColorCount >= 3) return current;
      }
      next[color] = Math.min(nextCount, bankCount(state.game.table.bank, color));
      for (const other of GEM_ORDER) {
        if (other !== color && next[other] > 1) next[other] = 1;
      }
      return next;
    });
  };

  const canCollectNoble = (noble) => controlsActivePlayer && !state.game.turnActions.noble && canTakeNoble(activePlayer, noble);
  const openSetup = () => {
    setSetupOpen(true);
  };

  if (blockedFromPlaying) {
    return <BlockedTable notice={notice} onReset={resetOnlineTable} />;
  }

  const shouldShowLobby = onlineEnabled && state.status !== "playing";

  return (
    <main
      className="game-shell"
      style={{
        "--scale": scale,
        "--card-width": `${BASE_SIZES.cardWidth * scale}px`,
        "--card-height": `${BASE_SIZES.cardHeight * scale}px`,
        "--noble-size": `${BASE_SIZES.nobleSize * scale}px`,
        "--chip-size": `${BASE_SIZES.chipSize * scale}px`,
      }}
    >
      <header className="game-toolbar">
        <div>
          <h1>Splendor</h1>
          <p>
            Max chip {state.game.settings.maxChips} · Win {state.game.settings.targetScore} pts · Turn{" "}
            {activePlayer?.name ?? "none"}
            {onlineEnabled ? " · Online" : " · Local"}
          </p>
        </div>

        <div className="toolbar-actions">
          {onlineEnabled ? (
            <button disabled={busy} type="button" onClick={() => setResetOpen(true)}>
              Reset
            </button>
          ) : (
            <button disabled={busy} type="button" onClick={openSetup}>
              Restart
            </button>
          )}
          <label className="scale-control">
            <span>Scale</span>
            <input
              max="1.2"
              min="0.55"
              onChange={(event) => setScale(Number(event.target.value))}
              step="0.01"
              type="range"
              value={scale}
            />
            <strong>{Math.round(scale * 100)}%</strong>
          </label>
        </div>
      </header>

      {showYourTurn ? (
        <div className={`turn-banner${shouldEndTurn ? " turn-banner-ready" : ""}`}>
          <strong>Your turn</strong>
          <span>{shouldEndTurn ? "Action done. End turn when ready." : `${activePlayer.name} is active.`}</span>
        </div>
      ) : null}

      <GameBoard
        activePlayerId={activePlayer?.id}
        canTakeNoble={canCollectNoble}
        currentDeviceId={deviceId}
        history={state.game.history}
        notice={notice || (!controlsActivePlayer && state.status === "playing" ? "Waiting for this device's turn." : "")}
        onCardClick={(payload) => {
          if (!controlsActivePlayer) return;
          setSelectedCard(payload);
          setNotice("");
          setGoldColor("");
        }}
        onChipClick={cycleChipSelection}
        onCollectChips={() => dispatchGameAction({ type: "COLLECT_CHIPS", payload: { selectedChips } })}
        onCollectNoble={(noble) => dispatchGameAction({ type: "COLLECT_NOBLE", payload: { noble } })}
        onEndTurn={() => dispatchGameAction({ type: "END_TURN" })}
        onUndo={() => dispatchGameAction({ type: "UNDO" })}
        players={state.players}
        selectedChips={selectedChips}
        shouldEndTurn={shouldEndTurn}
        table={state.game.table}
        turnActions={state.game.turnActions}
        undoEnabled={Boolean(state.game.undoSnapshot)}
      />

      {selectedCard ? (
        <div className="action-popover">
          <div>
            <strong>{selectedCard.card.id}</strong>
            <span>
              {selectedCard.source === "reserved" ? `Reserved by ${selectedCard.card.ownerName}` : `Level ${selectedCard.card.level}`}
            </span>
          </div>
          {activePlayer?.chips.yellow > 0 ? (
            <label>
              Gold for
              <select value={goldColor} onChange={(event) => setGoldColor(event.target.value)}>
                <option value="">Do not use</option>
                {GEM_ORDER.map((color) => (
                  <option key={color} value={color}>
                    {GEM_LABELS[color]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="popover-actions">
            <button
              disabled={state.game.turnActions.main || busy}
              type="button"
              onClick={() => dispatchGameAction({ type: "COLLECT_CARD", payload: { selectedCard, goldColor } })}
            >
              Collect
            </button>
            {selectedCard.source === "market" ? (
              <button
                disabled={state.game.turnActions.main || busy || bankCount(state.game.table.bank, "yellow") <= 0}
                type="button"
                onClick={() => dispatchGameAction({ type: "RESERVE_CARD", payload: { selectedCard } })}
              >
                Reserve
              </button>
            ) : null}
            <button type="button" onClick={() => setSelectedCard(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {!onlineEnabled && setupOpen ? (
        <LocalSetupModal onStart={localStartGame} />
      ) : null}

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
        <ResetModal
          busy={busy}
          notice={notice}
          onClose={() => setResetOpen(false)}
          onReset={resetOnlineTable}
        />
      ) : null}

      {state.status === "finished" ? (
        <WinnerModal
          busy={busy}
          onBackToLobby={() => dispatchGameAction({ type: "BACK_TO_LOBBY" })}
          winner={state.game.winner}
        />
      ) : null}
    </main>
  );
}
