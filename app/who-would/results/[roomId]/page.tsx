"use client";

import {
  useEffect,
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
  getMyWhoWouldPlayerInRoom,
  getWhoWouldFinalResults,
  getWhoWouldRoomById,
  rematchWhoWouldGame,
  type WhoWouldFinalResults,
  type WhoWouldPlayer,
  type WhoWouldRoom,
} from "@/lib/whoWould";

export default function WhoWouldResultsPage() {
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
    useState<WhoWouldFinalResults | null>(
      null
    );

  const [
    room,
    setRoom,
  ] =
    useState<WhoWouldRoom | null>(
      null
    );

  const [
    me,
    setMe,
  ] =
    useState<WhoWouldPlayer | null>(
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
            getWhoWouldFinalResults(
              roomId
            ),

            getWhoWouldRoomById(
              roomId
            ),

            getMyWhoWouldPlayerInRoom(
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
              ? "Nije moguće učitati rezultate."
              : "Could not load results."
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
                ? "Nije moguće učitati rezultate."
                : "Could not load results.")
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
          `who-would-results-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "who_would_rooms",
            filter:
              `id=eq.${roomId}`,
          },
          (payload) => {
            const updated =
              payload.new as WhoWouldRoom;

            setRoom(
              updated
            );

            if (
              updated.status ===
              "waiting"
            ) {
              router.replace(
                `/who-would/room/${updated.code}`
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
            0.85
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
        1100
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

      await rematchWhoWouldGame(
        roomId
      );

      if (room) {
        router.replace(
          `/who-would/room/${room.code}`
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
              duration: 1.5,
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

  const topScore =
    results.players[0]?.score ?? 0;

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
          😂 WHO WOULD?
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
          {language === "hr"
            ? "ZAVRŠNI REZULTATI"
            : "FINAL RESULTS"}
        </motion.h1>
      </motion.div>

      {topScore > 0 &&
        results.players.length >
          0 && (
          <motion.section
            className="relative overflow-hidden rounded-3xl border border-yellow-400/25 bg-yellow-400/10 p-7 text-center"
            initial={{
              opacity: 0,
              y: 25,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              delay: 0.6,
              type: "spring",
              stiffness: 160,
            }}
          >
            <motion.div
              className="absolute left-5 top-5 text-xl"
              initial={{
                opacity: 0,
                scale: 0,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                delay: 0.9,
              }}
            >
              ✨
            </motion.div>

            <motion.div
              className="absolute right-5 top-5 text-xl"
              initial={{
                opacity: 0,
                scale: 0,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                delay: 1,
              }}
            >
              ✨
            </motion.div>

            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
              {language === "hr"
                ? "NAJVIŠE GLASOVA"
                : "MOST VOTES"}
            </p>

            <motion.div
              className="mt-4 text-6xl"
              initial={{
                scale: 0,
              }}
              animate={{
                scale: 1,
              }}
              transition={{
                delay: 0.75,
                type: "spring",
                stiffness: 230,
              }}
            >
              {
                results.players[0]
                  .avatar
              }
            </motion.div>

            <motion.h2
              className="mt-3 text-3xl font-black"
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.9,
              }}
            >
              {
                results.players[0]
                  .nickname
              }
            </motion.h2>

            <motion.p
              className="mt-2 text-xl font-black text-yellow-300"
              initial={{
                opacity: 0,
                scale: 0.8,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                delay: 1.05,
                type: "spring",
              }}
            >
              {topScore} pts
            </motion.p>
          </motion.section>
        )}

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
          delay: 0.9,
        }}
      >
        <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-white/35">
          {language === "hr"
            ? "KONAČNI POREDAK"
            : "FINAL STANDINGS"}
        </p>

        <div className="flex flex-col gap-2">
          {results.players.map(
            (
              player,
              index
            ) => {
              const winner =
                player.score ===
                  topScore &&
                topScore > 0;

              return (
                <motion.div
                  key={
                    player.id
                  }
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                    winner
                      ? "border-accent bg-accent/15 shadow-lg shadow-accent/10"
                      : "border-white/10 bg-black/20"
                  }`}
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
                      1 +
                      index * 0.08,
                  }}
                >
                  <motion.span
                    className="w-7 text-center font-black"
                    initial={{
                      scale: 0.7,
                    }}
                    animate={{
                      scale: 1,
                    }}
                    transition={{
                      delay:
                        1.05 +
                        index *
                          0.08,
                      type: "spring",
                    }}
                  >
                    {index === 0
                      ? "🥇"
                      : index === 1
                      ? "🥈"
                      : index === 2
                      ? "🥉"
                      : `${index + 1}.`}
                  </motion.span>

                  <span className="text-2xl">
                    {player.avatar}
                  </span>

                  <span className="min-w-0 flex-1 truncate font-bold">
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
                  </span>

                  <motion.span
                    className="font-black text-accent"
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
                        1.15 +
                        index *
                          0.08,
                      type: "spring",
                    }}
                  >
                    {player.score}
                  </motion.span>
                </motion.div>
              );
            }
          )}
        </div>
      </motion.section>

      <motion.p
        className="text-center text-sm text-white/35"
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 1.25,
        }}
      >
        {language === "hr"
          ? `Odigrano rundi: ${results.total_rounds}`
          : `Rounds played: ${results.total_rounds}`}
      </motion.p>

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
          delay: 1.35,
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