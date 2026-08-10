"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { motion } from "motion/react";

import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";

import { playSound } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";

import {
  getMafiaFinalResults,
  getMafiaRoomById,
  getMyMafiaPlayerInRoom,
  rematchMafiaGame,
  type MafiaFinalResults,
  type MafiaPlayer,
  type MafiaRoom,
  type MafiaRole,
} from "@/lib/mafia";

const ROLE_LABELS: Record<
  MafiaRole,
  {
    emoji: string;
    hr: string;
    en: string;
  }
> = {
  MAFIA: {
    emoji: "🔪",
    hr: "Mafija",
    en: "Mafia",
  },

  DOCTOR: {
    emoji: "💉",
    hr: "Doktor",
    en: "Doctor",
  },

  DETECTIVE: {
    emoji: "🔎",
    hr: "Detektiv",
    en: "Detective",
  },

  CIVILIAN: {
    emoji: "🙂",
    hr: "Civil",
    en: "Civilian",
  },
};

export default function MafiaResultsPage() {
  const params = useParams();
  const router = useRouter();

  const { language } =
    useLanguage();

  const rawRoomId =
    params.roomId;

  const roomId =
    Array.isArray(rawRoomId)
      ? rawRoomId[0]
      : rawRoomId;

  const [
    results,
    setResults,
  ] =
    useState<MafiaFinalResults | null>(
      null
    );

  const [
    room,
    setRoom,
  ] =
    useState<MafiaRoom | null>(
      null
    );

  const [
    me,
    setMe,
  ] =
    useState<MafiaPlayer | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    rematching,
    setRematching,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const winnerSoundPlayed =
    useRef(false);

  const scoreSoundPlayed =
    useRef(false);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [
          freshResults,
          freshRoom,
          freshMe,
        ] =
          await Promise.all([
            getMafiaFinalResults(
              roomId
            ),

            getMafiaRoomById(
              roomId
            ),

            getMyMafiaPlayerInRoom(
              roomId
            ),
          ]);

        if (cancelled) {
          return;
        }

        if (
          !freshRoom ||
          !freshMe
        ) {
          throw new Error(
            language === "hr"
              ? "Nije moguće učitati završne rezultate."
              : "Could not load final results."
          );
        }

        setResults(
          freshResults
        );

        setRoom(
          freshRoom
        );

        setMe(
          freshMe
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati završne rezultate."
                : "Could not load final results.")
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    roomId,
    language,
  ]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `mafia-results-room-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "mafia_rooms",
            filter:
              `id=eq.${roomId}`,
          },
          (payload) => {
            const updated =
              payload.new as MafiaRoom;

            setRoom(
              updated
            );

            if (
              updated.status ===
              "waiting"
            ) {
              router.replace(
                `/mafia/room/${updated.code}`
              );
            }
          }
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [
    roomId,
    router,
  ]);

  useEffect(() => {
    if (
      loading ||
      !results ||
      winnerSoundPlayed.current
    ) {
      return;
    }

    winnerSoundPlayed.current =
      true;

    const timer =
      window.setTimeout(
        () => {
          playSound(
            "winner",
            0.9
          );
        },
        250
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    loading,
    results,
  ]);

  useEffect(() => {
    if (
      loading ||
      !results ||
      scoreSoundPlayed.current
    ) {
      return;
    }

    scoreSoundPlayed.current =
      true;

    const timer =
      window.setTimeout(
        () => {
          playSound(
            "score",
            0.65
          );
        },
        1200
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    loading,
    results,
  ]);

  const mafiaPlayers =
    useMemo(
      () =>
        results?.players.filter(
          (player) =>
            player.role ===
            "MAFIA"
        ) ?? [],
      [results]
    );

  async function handleRematch() {
    if (
      !roomId ||
      !me?.is_host ||
      rematching
    ) {
      return;
    }

    setRematching(true);
    setError(null);

    try {
      playSound(
        "new-round",
        0.75
      );

      await rematchMafiaGame(
        roomId
      );

      if (room) {
        router.replace(
          `/mafia/room/${room.code}`
        );
      }
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće pokrenuti novu igru."
            : "Could not start rematch.")
      );

      setRematching(
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
              duration: 1.6,
              repeat: Infinity,
            }}
          >
            🏆
          </motion.div>

          <p className="mt-4 text-white/50">
            {language === "hr"
              ? "Učitavanje rezultata..."
              : "Loading results..."}
          </p>
        </motion.div>
      </main>
    );
  }

  if (
    error &&
    !results
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-accent">
          {error}
        </p>
      </main>
    );
  }

  if (
    !results ||
    !room ||
    !me
  ) {
    return null;
  }

  const mafiaWon =
    results.winner ===
    "MAFIA";

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-5 p-6 pb-8">
      <motion.div
        className="text-center pt-5"
        initial={{
          opacity: 0,
          y: -20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <motion.div
          className="text-7xl"
          initial={{
            opacity: 0,
            scale: 0,
            rotate: -20,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            rotate: 0,
          }}
          transition={{
            delay: 0.15,
            type: "spring",
            stiffness: 210,
            damping: 12,
          }}
        >
          {mafiaWon
            ? "🔪"
            : "🏘️"}
        </motion.div>

        <motion.p
          className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-accent"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.35,
          }}
        >
          🎭 MAFIA
        </motion.p>

        <motion.h1
          className="mt-2 text-4xl font-black"
          initial={{
            opacity: 0,
            scale: 0.9,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 0.45,
            type: "spring",
          }}
        >
          {mafiaWon
            ? language === "hr"
              ? "MAFIJA POBJEĐUJE"
              : "MAFIA WINS"
            : language === "hr"
            ? "CIVILI POBJEĐUJU"
            : "CIVILIANS WIN"}
        </motion.h1>

        <motion.p
          className="mt-3 text-white/40"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.65,
          }}
        >
          {language === "hr"
            ? `Igra završena nakon ${results.day_number} dana.`
            : `Game ended after ${results.day_number} days.`}
        </motion.p>
      </motion.div>

      <motion.section
        className={`rounded-3xl border p-6 ${
          mafiaWon
            ? "border-red-400/25 bg-red-400/10"
            : "border-green-400/25 bg-green-400/10"
        }`}
        initial={{
          opacity: 0,
          y: 25,
          scale: 0.94,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          delay: 0.75,
          type: "spring",
          stiffness: 150,
        }}
      >
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
          {language === "hr"
            ? "MAFIJA JE BILA"
            : "THE MAFIA WAS"}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {mafiaPlayers.map(
            (
              player,
              index
            ) => (
              <motion.div
                key={
                  player.id
                }
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
                initial={{
                  opacity: 0,
                  x: -20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay:
                    0.9 +
                    index *
                      0.1,
                }}
              >
                <motion.span
                  className="text-2xl"
                  initial={{
                    scale: 0,
                  }}
                  animate={{
                    scale: 1,
                  }}
                  transition={{
                    delay:
                      1 +
                      index *
                        0.1,
                    type: "spring",
                  }}
                >
                  {player.avatar}
                </motion.span>

                <span className="flex-1 font-black">
                  {player.nickname}
                </span>

                <span>
                  {player.is_alive
                    ? "😈"
                    : "💀"}
                </span>
              </motion.div>
            )
          )}
        </div>
      </motion.section>

      <motion.section
        className="card p-5"
        initial={{
          opacity: 0,
          y: 25,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 1.05,
        }}
      >
        <h2 className="font-black">
          👥{" "}
          {language === "hr"
            ? "SVE ULOGE"
            : "ALL ROLES"}
        </h2>

        <div className="mt-4 flex flex-col gap-2">
          {results.players.map(
            (
              player,
              index
            ) => {
              const role =
                ROLE_LABELS[
                  player.role
                ];

              return (
                <motion.div
                  key={
                    player.id
                  }
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
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
                      1.15 +
                      index *
                        0.07,
                  }}
                >
                  <span className="text-2xl">
                    {player.avatar}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {player.nickname}

                      {player.id ===
                        me.id && (
                        <span className="ml-1 text-xs font-normal text-white/30">
                          {language ===
                          "hr"
                            ? "(ti)"
                            : "(you)"}
                        </span>
                      )}
                    </p>

                    <motion.p
                      className="text-xs text-white/35"
                      initial={{
                        opacity: 0,
                      }}
                      animate={{
                        opacity: 1,
                      }}
                      transition={{
                        delay:
                          1.3 +
                          index *
                            0.07,
                      }}
                    >
                      {role.emoji}{" "}
                      {language === "hr"
                        ? role.hr
                        : role.en}
                    </motion.p>
                  </div>

                  <motion.span
                    initial={{
                      opacity: 0,
                      scale: 0.7,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    transition={{
                      delay:
                        1.35 +
                        index *
                          0.07,
                      type: "spring",
                    }}
                  >
                    {player.is_alive
                      ? "❤️"
                      : "💀"}
                  </motion.span>
                </motion.div>
              );
            }
          )}
        </div>
      </motion.section>

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <motion.div
        className="mt-auto flex flex-col gap-3 pt-3"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 1.5,
        }}
      >
        {me.is_host && (
          <Button
            onClick={
              handleRematch
            }
            disabled={
              rematching
            }
          >
            {rematching
              ? language === "hr"
                ? "POKRETANJE..."
                : "STARTING..."
              : language === "hr"
              ? "🔄 IGRAJ PONOVNO"
              : "🔄 REMATCH"}
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={() => {
            playSound(
              "click",
              0.5
            );

            router.push("/");
          }}
        >
          🏠 PARTY GAMES
        </Button>
      </motion.div>
    </main>
  );
}