"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { motion } from "motion/react";
import QRCode from "react-qr-code";

import Button from "@/components/Button";
import RoomCodeDisplay from "@/components/RoomCodeDisplay";
import { useLanguage } from "@/components/LanguageProvider";

import {
  getRememberedBombPlayerId,
  kickBombPlayer,
  startBombGame,
  updateBombSettings,
  useBombRoomRealtime,
} from "@/lib/bomb";

const LIFE_OPTIONS = [
  1,
  2,
  3,
];

const TIMER_OPTIONS = [
  {
    label: "15–25s",
    min: 15,
    max: 25,
  },
  {
    label: "15–35s",
    min: 15,
    max: 35,
  },
  {
    label: "20–40s",
    min: 20,
    max: 40,
  },
];

export default function BombRoomPage() {
  const params = useParams();
  const router = useRouter();

  const { language } =
    useLanguage();

  const rawCode =
    params.code;

  const code =
    (
      Array.isArray(rawCode)
        ? rawCode[0]
        : rawCode
    )?.toUpperCase() ?? "";

  const {
    room,
    players,
    loading,
    error,
  } = useBombRoomRealtime(
    code
  );

  const meId =
    getRememberedBombPlayerId(
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
  ] =
    useState<string | null>(
      null
    );

  const [
    kickingId,
    setKickingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    startLoading,
    setStartLoading,
  ] = useState(false);

  const [
    startError,
    setStartError,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    if (!room) {
      return;
    }

    if (
      room.status ===
      "playing"
    ) {
      router.replace(
        `/bomb/game/${room.id}`
      );
    }

    if (
      room.status ===
      "ended"
    ) {
      router.replace(
        `/bomb/results/${room.id}`
      );
    }
  }, [
    room,
    router,
  ]);

  async function changeSettings(
    patch: Parameters<
      typeof updateBombSettings
    >[1]
  ) {
    if (
      !room ||
      !me?.is_host ||
      settingsLoading
    ) {
      return;
    }

    setSettingsLoading(
      true
    );

    setSettingsError(
      null
    );

    try {
      await updateBombSettings(
        room.id,
        patch
      );
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće spremiti postavke."
            : "Could not update settings.")
      );
    } finally {
      setSettingsLoading(
        false
      );
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

    setKickingId(
      playerId
    );

    setSettingsError(
      null
    );

    try {
      await kickBombPlayer(
        room.id,
        playerId
      );
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće izbaciti igrača."
            : "Could not kick player.")
      );
    } finally {
      setKickingId(
        null
      );
    }
  }

  async function handleStart() {
    if (
      !room ||
      !me?.is_host ||
      players.length < 2 ||
      startLoading
    ) {
      return;
    }

    setStartLoading(
      true
    );

    setStartError(
      null
    );

    try {
      await startBombGame(
        room.id
      );

      router.replace(
        `/bomb/game/${room.id}`
      );
    } catch (e: any) {
      setStartError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće pokrenuti Bomb."
            : "Could not start Bomb.")
      );

      setStartLoading(
        false
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          className="text-center"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
        >
          <motion.div
            className="text-7xl"
            animate={{
              scale: [
                1,
                1.08,
                1,
              ],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
            }}
          >
            💣
          </motion.div>

          <p className="mt-4 text-white/50">
            {language === "hr"
              ? "Učitavanje sobe..."
              : "Loading room..."}
          </p>
        </motion.div>
      </main>
    );
  }

  if (
    error ||
    !room
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-accent">
          {error ??
            (language === "hr"
              ? "Soba nije pronađena."
              : "Room not found.")}
        </p>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen max-w-md mx-auto flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-6xl">
          💣
        </div>

        <h1 className="text-2xl font-black">
          {language === "hr"
            ? "Nisi u ovoj sobi"
            : "You're not in this room"}
        </h1>

        <Button
          onClick={() =>
            router.push(
              `/bomb/join?code=${room.code}`
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

  const canStart =
    players.length >= 2;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <motion.div
        className="text-center pt-4"
        initial={{
          opacity: 0,
          y: -18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <motion.div
          className="text-6xl"
          animate={{
            rotate: [
              -3,
              3,
              -3,
            ],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
          }}
        >
          💣
        </motion.div>

        <p className="mt-3 text-xs font-black uppercase tracking-[0.3em] text-accent">
          BOMB
        </p>

        <h1 className="mt-2 text-3xl font-black">
          LOBBY
        </h1>
      </motion.div>

      <RoomCodeDisplay
        code={room.code}
      />

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{
          opacity: 0,
          scale: 0.95,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
      >
        <div className="rounded-2xl bg-white p-4">
          <QRCode
            value={`${window.location.origin}/bomb/join?code=${room.code}`}
            size={150}
          />
        </div>

        <p className="text-sm text-white/40">
          📱{" "}
          {language === "hr"
            ? "Skeniraj za pridruživanje"
            : "Scan to join"}
        </p>
      </motion.div>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-white/35">
          {language === "hr"
            ? "IGRAČI"
            : "PLAYERS"}{" "}
          ({players.length}/12)
        </p>

        {players.map(
          (
            player,
            index
          ) => (
            <motion.div
              key={player.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-panel2 px-4 py-3"
              initial={{
                opacity: 0,
                x: -15,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay:
                  index * 0.05,
              }}
            >
              <span className="text-3xl">
                {player.avatar}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {player.nickname}

                  {player.id ===
                    meId && (
                    <span className="text-white/35">
                      {" "}
                      {language ===
                      "hr"
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

              <div className="text-sm">
                {Array.from({
                  length:
                    room.starting_lives,
                }).map(
                  (_, lifeIndex) => (
                    <span
                      key={
                        lifeIndex
                      }
                    >
                      ❤️
                    </span>
                  )
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
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 active:scale-95"
                  >
                    {kickingId ===
                    player.id
                      ? "..."
                      : "👢"}
                  </button>
                )}
            </motion.div>
          )
        )}
      </section>

      {me.is_host && (
        <motion.section
          className="card p-5 flex flex-col gap-6"
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
              👑 HOST
            </p>

            <h2 className="mt-1 text-xl font-black">
              {language === "hr"
                ? "Postavke igre"
                : "Game Settings"}
            </h2>
          </div>

          <div>
            <div className="mb-3 flex justify-between">
              <span className="text-sm font-bold">
                ❤️{" "}
                {language === "hr"
                  ? "ŽIVOTI"
                  : "LIVES"}
              </span>

              <span className="font-black text-accent">
                {room.starting_lives}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {LIFE_OPTIONS.map(
                (lives) => (
                  <button
                    key={lives}
                    type="button"
                    disabled={
                      settingsLoading
                    }
                    onClick={() =>
                      changeSettings({
                        starting_lives:
                          lives,
                      })
                    }
                    className={`rounded-xl border py-3 font-black active:scale-95 ${
                      room.starting_lives ===
                      lives
                        ? "border-accent bg-accent/20"
                        : "border-white/10 bg-black/20 text-white/50"
                    }`}
                  >
                    {lives} ❤️
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-bold">
              ⏱️{" "}
              {language === "hr"
                ? "TAJNI TIMER"
                : "SECRET TIMER"}
            </p>

            <div className="grid grid-cols-3 gap-2">
              {TIMER_OPTIONS.map(
                (option) => {
                  const selected =
                    room.timer_min_seconds ===
                      option.min &&
                    room.timer_max_seconds ===
                      option.max;

                  return (
                    <button
                      key={
                        option.label
                      }
                      type="button"
                      disabled={
                        settingsLoading
                      }
                      onClick={() =>
                        changeSettings({
                          timer_min_seconds:
                            option.min,
                          timer_max_seconds:
                            option.max,
                        })
                      }
                      className={`rounded-xl border py-3 text-xs font-black active:scale-95 ${
                        selected
                          ? "border-accent bg-accent/20"
                          : "border-white/10 bg-black/20 text-white/50"
                      }`}
                    >
                      {
                        option.label
                      }
                    </button>
                  );
                }
              )}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-white/35">
              {language === "hr"
                ? "Igrači ne vide koliko je vremena ostalo. Predavanje bombe ne resetira timer."
                : "Players cannot see the remaining time. Passing the bomb does not reset the timer."}
            </p>
          </div>

          {settingsError && (
            <p className="text-sm text-accent">
              {settingsError}
            </p>
          )}
        </motion.section>
      )}

      {!canStart && (
        <p className="text-center text-sm text-white/40">
          {language === "hr"
            ? "Potrebna su najmanje 2 igrača."
            : "At least 2 players are required."}
        </p>
      )}

      <div className="mt-auto pb-4">
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
                  ? "PALJENJE BOMBE..."
                  : "LIGHTING BOMB..."
                : canStart
                ? language === "hr"
                  ? "💣 POKRENI BOMB"
                  : "💣 START BOMB"
                : language === "hr"
                ? "ČEKAMO IGRAČE..."
                : "WAITING FOR PLAYERS..."}
            </Button>
          </>
        ) : (
          <p className="text-center text-sm text-white/40">
            {language === "hr"
              ? "Čekamo hosta..."
              : "Waiting for host..."}
          </p>
        )}
      </div>
    </main>
  );
}