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

import { playSound } from "@/lib/sounds";

import {
  getRememberedDrawGuessPlayerId,
  kickDrawGuessPlayer,
  startDrawGuessGame,
  updateDrawGuessSettings,
  useDrawGuessRoomRealtime,
  useDrawGuessPresence,
} from "@/lib/drawGuess";

const ROUND_OPTIONS = [
  3,
  5,
  7,
  10,
];

const TIME_OPTIONS = [
  30,
  45,
  60,
  90,
];

const DIFFICULTY_OPTIONS = [
  "all",
  "easy",
  "medium",
  "hard",
] as const;

const CATEGORY_OPTIONS = [
  { value: "all", emoji: "🎲", hr: "Sve", en: "All" },
  { value: "animals", emoji: "🐾", hr: "Životinje", en: "Animals" },
  { value: "food", emoji: "🍕", hr: "Hrana", en: "Food" },
  { value: "objects", emoji: "📦", hr: "Predmeti", en: "Objects" },
  { value: "places", emoji: "🌍", hr: "Mjesta", en: "Places" },
  { value: "actions", emoji: "🏃", hr: "Radnje", en: "Actions" },
  { value: "body", emoji: "🫀", hr: "Tijelo", en: "Body" },
  { value: "clothing", emoji: "👕", hr: "Odjeća", en: "Clothing" },
  { value: "gaming", emoji: "🎮", hr: "Gaming", en: "Gaming" },
  { value: "jobs", emoji: "💼", hr: "Poslovi", en: "Jobs" },
  { value: "nature", emoji: "🌿", hr: "Priroda", en: "Nature" },
  { value: "sports", emoji: "⚽", hr: "Sport", en: "Sports" },
  { value: "vehicles", emoji: "🚗", hr: "Vozila", en: "Vehicles" },
  { value: "random", emoji: "✨", hr: "Nasumično", en: "Random" },
] as const;

export default function DrawGuessRoomPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const {
    language,
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
  } =
    useDrawGuessRoomRealtime(
      code
    );

  useDrawGuessPresence(
    room?.id
  );

  const meId =
    getRememberedDrawGuessPlayerId(
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
  ] = useState<
    string | null
  >(null);

  const [
    kickingId,
    setKickingId,
  ] = useState<
    string | null
  >(null);

  const [
    startLoading,
    setStartLoading,
  ] = useState(false);

  const [
    startError,
    setStartError,
  ] = useState<
    string | null
  >(null);

  async function changeSettings(
    patch: Parameters<
      typeof updateDrawGuessSettings
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
      playSound(
        "click",
        0.45
      );

      await updateDrawGuessSettings(
        room.id,
        patch
      );
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          "Could not update settings."
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
      playSound(
        "click",
        0.45
      );

      await kickDrawGuessPlayer(
        room.id,
        playerId
      );
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          "Could not kick player."
      );
    } finally {
      setKickingId(
        null
      );
    }
  }

  useEffect(() => {
    if (!room) {
      return;
    }

    if (
      room.status ===
      "choosing"
    ) {
      router.replace(
        `/draw-guess/choose/${room.id}`
      );
    }

    if (
      room.status ===
      "drawing"
    ) {
      router.replace(
        `/draw-guess/game/${room.id}`
      );
    }

    if (
      room.status ===
      "ended"
    ) {
      router.replace(
        `/draw-guess/results/${room.id}`
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
      playSound(
        "start",
        0.85
      );

      await startDrawGuessGame(
        room.id
      );

      router.replace(
        `/draw-guess/choose/${room.id}`
      );
    } catch (e: any) {
      setStartError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće pokrenuti igru."
            : "Could not start game.")
      );

      setStartLoading(
        false
      );
    }
  }


  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
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
            className="text-6xl"
            animate={{
              scale: [
                1,
                1.08,
                1,
              ],
            }}
            transition={{
              duration:
                1.4,

              repeat:
                Infinity,
            }}
          >
            🎨
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
            "Room not found."}
        </p>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen max-w-md mx-auto flex flex-col items-center justify-center gap-5 p-6 text-center">
        <motion.div
          className="text-5xl"
          initial={{
            opacity:
              0,

            scale:
              0.5,
          }}
          animate={{
            opacity:
              1,

            scale:
              1,
          }}
          transition={{
            type:
              "spring",
          }}
        >
          🎨
        </motion.div>

        <h1 className="text-2xl font-black">
          {language === "hr"
            ? "Nisi u ovoj sobi"
            : "You're not in this room"}
        </h1>

        <Button
          onClick={() =>
            router.push(
              `/draw-guess/join?code=${room.code}`
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
        className="text-center pt-3"
        initial={{
          opacity:
            0,

          y:
            -20,
        }}
        animate={{
          opacity:
            1,

          y:
            0,
        }}
      >
        <motion.p
          className="text-xs font-black uppercase tracking-[0.25em] text-accent"
          initial={{
            opacity:
              0,
          }}
          animate={{
            opacity:
              1,
          }}
          transition={{
            delay:
              0.1,
          }}
        >
          🎨 DRAW & GUESS
        </motion.p>

        <motion.h1
          className="mt-1 text-3xl font-black"
          initial={{
            opacity:
              0,

            scale:
              0.9,
          }}
          animate={{
            opacity:
              1,

            scale:
              1,
          }}
          transition={{
            delay:
              0.15,

            type:
              "spring",
          }}
        >
          LOBBY
        </motion.h1>
      </motion.div>

      <motion.div
        initial={{
          opacity:
            0,

          y:
            15,
        }}
        animate={{
          opacity:
            1,

          y:
            0,
        }}
        transition={{
          delay:
            0.2,
        }}
      >
        <RoomCodeDisplay
          code={
            room.code
          }
        />
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{
          opacity:
            0,

          scale:
            0.95,
        }}
        animate={{
          opacity:
            1,

          scale:
            1,
        }}
        transition={{
          delay:
            0.25,
        }}
      >
        <div className="rounded-2xl bg-white p-4">
          <QRCode
            value={`${window.location.origin}/draw-guess/join?code=${room.code}`}
            size={
              150
            }
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
              key={
                player.id
              }
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-panel2 px-4 py-3"
              initial={{
                opacity:
                  0,

                x:
                  -15,
              }}
              animate={{
                opacity:
                  1,

                x:
                  0,
              }}
              transition={{
                delay:
                  0.3 +
                  index *
                    0.05,
              }}
            >
              <motion.div
                className="text-3xl"
                initial={{
                  scale:
                    0.7,
                }}
                animate={{
                  scale:
                    1,
                }}
                transition={{
                  type:
                    "spring",
                }}
              >
                {
                  player.avatar
                }
              </motion.div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {
                    player.nickname
                  }

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
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 transition active:scale-95"
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
            opacity:
              0,

            y:
              20,
          }}
          animate={{
            opacity:
              1,

            y:
              0,
          }}
          transition={{
            delay:
              0.4,
          }}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
              HOST
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
                {language === "hr"
                  ? "RUNDE"
                  : "ROUNDS"}
              </span>

              <span className="font-black text-accent">
                {
                  room.total_rounds
                }
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {ROUND_OPTIONS.map(
                (
                  rounds
                ) => (
                  <motion.button
                    key={
                      rounds
                    }
                    disabled={
                      settingsLoading
                    }
                    onClick={() =>
                      changeSettings({
                        total_rounds:
                          rounds,
                      })
                    }
                    whileTap={{
                      scale:
                        0.94,
                    }}
                    className={`rounded-xl border py-3 font-black ${
                      room.total_rounds ===
                      rounds
                        ? "border-accent bg-accent/20"
                        : "border-white/10 bg-black/20 text-white/50"
                    }`}
                  >
                    {
                      rounds
                    }
                  </motion.button>
                )
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex justify-between">
              <span className="text-sm font-bold">
                {language === "hr"
                  ? "VRIJEME CRTANJA"
                  : "DRAW TIME"}
              </span>

              <span className="font-black text-accent">
                {
                  room.round_time_seconds
                }
                s
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {TIME_OPTIONS.map(
                (
                  seconds
                ) => (
                  <motion.button
                    key={
                      seconds
                    }
                    disabled={
                      settingsLoading
                    }
                    onClick={() =>
                      changeSettings({
                        round_time_seconds:
                          seconds,
                      })
                    }
                    whileTap={{
                      scale:
                        0.94,
                    }}
                    className={`rounded-xl border py-3 font-black ${
                      room.round_time_seconds ===
                      seconds
                        ? "border-accent bg-accent/20"
                        : "border-white/10 bg-black/20 text-white/50"
                    }`}
                  >
                    {
                      seconds
                    }s
                  </motion.button>
                )
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex justify-between">
              <span className="text-sm font-bold">
                {language === "hr"
                  ? "TEŽINA RIJEČI"
                  : "WORD DIFFICULTY"}
              </span>

              <span className="font-black text-accent">
                {room.word_difficulty === "easy"
                  ? language === "hr"
                    ? "LAKO"
                    : "EASY"
                  : room.word_difficulty === "medium"
                  ? language === "hr"
                    ? "SREDNJE"
                    : "MEDIUM"
                  : room.word_difficulty === "hard"
                  ? language === "hr"
                    ? "TEŠKO"
                    : "HARD"
                  : language === "hr"
                  ? "SVE"
                  : "ALL"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTY_OPTIONS.map(
                (difficulty) => (
                  <motion.button
                    key={difficulty}
                    disabled={settingsLoading}
                    onClick={() =>
                      changeSettings({
                        word_difficulty: difficulty,
                      })
                    }
                    whileTap={{
                      scale: 0.94,
                    }}
                    className={`rounded-xl border py-3 font-black ${
                      (room.word_difficulty ?? "all") === difficulty
                        ? "border-accent bg-accent/20"
                        : "border-white/10 bg-black/20 text-white/50"
                    }`}
                  >
                    {difficulty === "easy"
                      ? language === "hr"
                        ? "🟢 LAKO"
                        : "🟢 EASY"
                      : difficulty === "medium"
                      ? language === "hr"
                        ? "🟡 SREDNJE"
                        : "🟡 MEDIUM"
                      : difficulty === "hard"
                      ? language === "hr"
                        ? "🔴 TEŠKO"
                        : "🔴 HARD"
                      : language === "hr"
                      ? "🎲 SVE"
                      : "🎲 ALL"}
                  </motion.button>
                )
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex justify-between">
              <span className="text-sm font-bold">
                {language === "hr"
                  ? "KATEGORIJA RIJEČI"
                  : "WORD CATEGORY"}
              </span>

              <span className="font-black text-accent">
                {(() => {
                  const selected = CATEGORY_OPTIONS.find(
                    (item) =>
                      item.value === (room.word_category ?? "all")
                  ) ?? CATEGORY_OPTIONS[0];

                  return `${selected.emoji} ${
                    language === "hr" ? selected.hr : selected.en
                  }`;
                })()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((category) => (
                <motion.button
                  key={category.value}
                  disabled={settingsLoading}
                  onClick={() =>
                    changeSettings({
                      word_category: category.value,
                    })
                  }
                  whileTap={{
                    scale: 0.94,
                  }}
                  className={`rounded-xl border px-2 py-3 text-sm font-black ${
                    (room.word_category ?? "all") === category.value
                      ? "border-accent bg-accent/20"
                      : "border-white/10 bg-black/20 text-white/50"
                  }`}
                >
                  {category.emoji}{" "}
                  {language === "hr" ? category.hr : category.en}
                </motion.button>
              ))}
            </div>
          </div>

          {settingsError && (
            <p className="text-sm text-accent">
              {
                settingsError
              }
            </p>
          )}
        </motion.section>
      )}

      {!canStart && (
        <motion.p
          className="text-center text-sm text-white/40"
          initial={{
            opacity:
              0,
          }}
          animate={{
            opacity:
              1,
          }}
        >
          {language === "hr"
            ? "Potrebna su najmanje 2 igrača."
            : "At least 2 players are required."}
        </motion.p>
      )}

      <motion.div
        className="mt-auto"
        initial={{
          opacity:
            0,

          y:
            15,
        }}
        animate={{
          opacity:
            1,

          y:
            0,
        }}
        transition={{
          delay:
            0.5,
        }}
      >
        {me.is_host ? (
          <>
            {startError && (
              <p className="mb-3 text-center text-sm text-accent">
                {
                  startError
                }
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
                ? language ===
                  "hr"
                  ? "POKRETANJE..."
                  : "STARTING..."
                : canStart
                ? language ===
                  "hr"
                  ? "🎨 POKRENI IGRU"
                  : "🎨 START GAME"
                : language ===
                  "hr"
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
      </motion.div>
    </main>
  );
}