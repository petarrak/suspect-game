"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import QRCode from "react-qr-code";

import Button from "@/components/Button";
import RoomCodeDisplay from "@/components/RoomCodeDisplay";
import { useLanguage } from "@/components/LanguageProvider";

import { playSound } from "@/lib/sounds";

import {
  getRememberedMafiaPlayerId,
  kickMafiaPlayer,
  startMafiaGame,
  updateMafiaSettings,
  useMafiaRoomRealtime,
} from "@/lib/mafia";

const DISCUSSION_OPTIONS = [
  30,
  45,
  60,
  90,
];

const VOTING_OPTIONS = [
  15,
  20,
  30,
  45,
];

export default function MafiaRoomPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const {
    language,
    t,
  } = useLanguage();

  const code =
    (
      params.code as string
    ).toUpperCase();

  const {
    room,
    players,
    loading,
    error,
  } = useMafiaRoomRealtime(
    code
  );

  const meId =
    getRememberedMafiaPlayerId(
      code
    );

  const me =
    players.find(
      (player) =>
        player.id === meId
    ) ?? null;

  const [
    settingsLoading,
    setSettingsLoading,
  ] = useState(false);

  const [
    settingsError,
    setSettingsError,
  ] = useState<string | null>(
    null
  );

  const [
    kickingId,
    setKickingId,
  ] = useState<string | null>(
    null
  );

  const [
    startLoading,
    setStartLoading,
  ] = useState(false);

  const [
    startError,
    setStartError,
  ] = useState<string | null>(
    null
  );

  async function changeSettings(
    patch: Parameters<
      typeof updateMafiaSettings
    >[1]
  ) {
    if (
      !room ||
      !me?.is_host ||
      settingsLoading
    ) {
      return;
    }

    setSettingsLoading(true);
    setSettingsError(null);

    try {
      await updateMafiaSettings(
        room.id,
        patch
      );
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          "Could not update settings."
      );
    } finally {
      setSettingsLoading(false);
    }
  }

  async function handleKick(
    playerId: string
  ) {
    if (
      !room ||
      !me?.is_host ||
      kickingId
    ) {
      return;
    }

    setKickingId(playerId);
    setSettingsError(null);

    try {
      await kickMafiaPlayer(
        room.id,
        playerId
      );
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          "Could not kick player."
      );
    } finally {
      setKickingId(null);
    }
  }

  useEffect(() => {
    if (!room) {
      return;
    }

    if (
      room.status === "role"
    ) {
      router.replace(
        `/mafia/role/${room.id}`
      );
    }

    if (
      room.status === "night"
    ) {
      router.replace(
        `/mafia/night/${room.id}`
      );
    }
  }, [
    room,
    router,
  ]);

  async function handleStart() {
    if (
      !room ||
      !me?.is_host ||
      players.length < 4 ||
      startLoading
    ) {
      return;
    }

    setStartLoading(true);
    setStartError(null);

    try {
      playSound(
        "start",
        0.8
      );

      await startMafiaGame(
        room.id
      );

      router.replace(
        `/mafia/role/${room.id}`
      );
    } catch (e: any) {
      setStartError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće pokrenuti Mafiju."
            : "Could not start Mafia.")
      );

      setStartLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/50">
          {language === "hr"
            ? "Učitavanje Mafia sobe..."
            : "Loading Mafia room..."}
        </p>
      </main>
    );
  }

  if (
    error ||
    !room
  ) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-6">
        <p className="text-accent">
          {error ??
            "Room not found."}
        </p>

        <Button
          variant="secondary"
          onClick={() =>
            router.push("/mafia")
          }
        >
          {t("back")}
        </Button>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen max-w-md mx-auto flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-5xl">
          🎭
        </div>

        <h1 className="text-2xl font-black">
          {language === "hr"
            ? "Nisi u ovoj sobi"
            : "You're not in this room"}
        </h1>

        <Button
          onClick={() =>
            router.push(
              `/mafia/join?code=${room.code}`
            )
          }
        >
          {language === "hr"
            ? "PRIDRUŽI SE"
            : "JOIN"}
        </Button>
      </main>
    );
  }

  const playerCount =
    players.length;

  const suggestedMafia =
    playerCount >= 11
      ? 3
      : playerCount >= 7
      ? 2
      : 1;

  const canStart =
    playerCount >= 4;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <div className="text-center pt-3">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          🎭 MAFIA
        </p>

        <h1 className="mt-1 text-3xl font-black">
          LOBBY
        </h1>
      </div>

      <RoomCodeDisplay
        code={room.code}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-white p-4">
          <QRCode
            value={`${window.location.origin}/mafia/join?code=${room.code}`}
            size={150}
          />
        </div>

        <p className="text-sm text-white/40">
          📱{" "}
          {language === "hr"
            ? "Skeniraj za pridruživanje"
            : "Scan to join"}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-white/35">
          {language === "hr"
            ? "IGRAČI"
            : "PLAYERS"}{" "}
          ({players.length}/12)
        </p>

        {players.map(
          (player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-panel2 px-4 py-3"
            >
              <div className="text-3xl">
                {player.avatar ||
                  "🙂"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">
                  {player.nickname}

                  {player.id ===
                    meId && (
                    <span className="text-white/35">
                      {" "}
                      {language === "hr"
                        ? "(ti)"
                        : "(you)"}
                    </span>
                  )}
                </p>

                {player.is_host && (
                  <span className="text-[10px] font-black text-yellow-300">
                    HOST
                  </span>
                )}
              </div>

              {me.is_host &&
                !player.is_host && (
                  <button
                    type="button"
                    disabled={
                      kickingId ===
                      player.id
                    }
                    onClick={() =>
                      handleKick(
                        player.id
                      )
                    }
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
                  >
                    {kickingId ===
                    player.id
                      ? "..."
                      : "👢"}
                  </button>
                )}
            </div>
          )
        )}
      </section>

      {me.is_host && (
        <section className="card p-5 flex flex-col gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
              HOST
            </p>

            <h2 className="mt-1 text-xl font-black">
              {language === "hr"
                ? "Postavke Mafije"
                : "Mafia Settings"}
            </h2>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold">
                🔪 Mafia
              </span>

              <span className="text-accent font-black">
                {room.mafia_count}
              </span>
            </div>

            <p className="mt-2 text-xs text-white/35">
              {language === "hr"
                ? `Preporuka za ${playerCount} igrača: ${suggestedMafia}`
                : `Recommended for ${playerCount} players: ${suggestedMafia}`}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1, 2, 3].map(
                (count) => (
                  <button
                    key={count}
                    disabled={
                      settingsLoading
                    }
                    onClick={() =>
                      changeSettings({
                        mafia_count:
                          count,
                      })
                    }
                    className={`rounded-xl border py-3 font-black ${
                      room.mafia_count ===
                      count
                        ? "border-accent bg-accent/20"
                        : "border-white/10 bg-black/20 text-white/50"
                    }`}
                  >
                    {count}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={
                settingsLoading
              }
              onClick={() =>
                changeSettings({
                  doctor_enabled:
                    !room.doctor_enabled,
                })
              }
              className={`rounded-2xl border p-4 text-left ${
                room.doctor_enabled
                  ? "border-green-400/25 bg-green-400/10"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <div className="text-2xl">
                💉
              </div>

              <p className="mt-2 font-black">
                {language === "hr"
                  ? "Doktor"
                  : "Doctor"}
              </p>

              <p className="mt-1 text-xs text-white/35">
                {room.doctor_enabled
                  ? "ON"
                  : "OFF"}
              </p>
            </button>

            <button
              type="button"
              disabled={
                settingsLoading
              }
              onClick={() =>
                changeSettings({
                  detective_enabled:
                    !room.detective_enabled,
                })
              }
              className={`rounded-2xl border p-4 text-left ${
                room.detective_enabled
                  ? "border-blue-400/25 bg-blue-400/10"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <div className="text-2xl">
                🔎
              </div>

              <p className="mt-2 font-black">
                {language === "hr"
                  ? "Detektiv"
                  : "Detective"}
              </p>

              <p className="mt-1 text-xs text-white/35">
                {room.detective_enabled
                  ? "ON"
                  : "OFF"}
              </p>
            </button>
          </div>

          <div>
            <div className="flex justify-between mb-3">
              <span className="text-sm font-bold">
                {language === "hr"
                  ? "RASPRAVA"
                  : "DISCUSSION"}
              </span>

              <span className="text-accent font-black">
                {room.discussion_time}s
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {DISCUSSION_OPTIONS.map(
                (seconds) => (
                  <button
                    key={seconds}
                    disabled={
                      settingsLoading
                    }
                    onClick={() =>
                      changeSettings({
                        discussion_time:
                          seconds,
                      })
                    }
                    className={`rounded-xl border py-3 text-sm font-black ${
                      room.discussion_time ===
                      seconds
                        ? "border-accent bg-accent/20"
                        : "border-white/10 bg-black/20 text-white/50"
                    }`}
                  >
                    {seconds}s
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-3">
              <span className="text-sm font-bold">
                {language === "hr"
                  ? "GLASANJE"
                  : "VOTING"}
              </span>

              <span className="text-accent font-black">
                {room.voting_time}s
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {VOTING_OPTIONS.map(
                (seconds) => (
                  <button
                    key={seconds}
                    disabled={
                      settingsLoading
                    }
                    onClick={() =>
                      changeSettings({
                        voting_time:
                          seconds,
                      })
                    }
                    className={`rounded-xl border py-3 text-sm font-black ${
                      room.voting_time ===
                      seconds
                        ? "border-accent bg-accent/20"
                        : "border-white/10 bg-black/20 text-white/50"
                    }`}
                  >
                    {seconds}s
                  </button>
                )
              )}
            </div>
          </div>

          {settingsError && (
            <p className="text-sm text-accent">
              {settingsError}
            </p>
          )}
        </section>
      )}

      {!canStart && (
        <p className="text-center text-sm text-white/40">
          {language === "hr"
            ? "Potrebna su najmanje 4 igrača."
            : "At least 4 players are required."}
        </p>
      )}

      <div className="mt-auto">
        {me.is_host ? (
          <>
            {startError && (
              <p className="mb-3 text-center text-sm text-accent">
                {startError}
              </p>
            )}

            <Button
              disabled={
                !canStart ||
                startLoading
              }
              onClick={
                handleStart
              }
            >
              {startLoading
                ? language === "hr"
                  ? "DODJELA ULOGA..."
                  : "ASSIGNING ROLES..."
                : canStart
                ? language === "hr"
                  ? "🎭 POKRENI MAFIJU"
                  : "🎭 START MAFIA"
                : language === "hr"
                ? "ČEKAMO IGRAČE..."
                : "WAITING FOR PLAYERS..."}
            </Button>
          </>
        ) : (
          <p className="text-center text-white/40">
            {language === "hr"
              ? "Čekamo hosta..."
              : "Waiting for host..."}
          </p>
        )}
      </div>
    </main>
  );
}