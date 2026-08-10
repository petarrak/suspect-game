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
  finishWhoWouldRound,
  getMyWhoWouldPlayerInRoom,
  getWhoWouldQuestion,
  getWhoWouldReveal,
  getWhoWouldRoomById,
  type WhoWouldPlayer,
  type WhoWouldQuestion,
  type WhoWouldRevealData,
  type WhoWouldRoom,
} from "@/lib/whoWould";

export default function WhoWouldRevealPage() {
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
    question,
    setQuestion,
  ] =
    useState<WhoWouldQuestion | null>(
      null
    );

  const [
    reveal,
    setReveal,
  ] =
    useState<WhoWouldRevealData | null>(
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
    continuing,
    setContinuing,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const revealSoundPlayed =
    useRef(false);

  const scoreSoundPlayed =
    useRef(false);

  const winnerSoundPlayed =
    useRef(false);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [
          freshQuestion,
          freshReveal,
          freshRoom,
          freshMe,
        ] =
          await Promise.all([
            getWhoWouldQuestion(
              roomId
            ),

            getWhoWouldReveal(
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

        setQuestion(
          freshQuestion
        );

        setReveal(
          freshReveal
        );

        setRoom(
          freshRoom
        );

        setMe(
          freshMe
        );

        if (
          freshRoom.status ===
          "ended"
        ) {
          router.replace(
            `/who-would/results/${roomId}`
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati reveal."
                : "Could not load reveal.")
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
    router,
  ]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `who-would-reveal-room-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",
            schema:
              "public",
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
              "question"
            ) {
              router.replace(
                `/who-would/question/${roomId}`
              );
            }

            if (
              updated.status ===
              "ended"
            ) {
              router.replace(
                `/who-would/results/${roomId}`
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

  const totalVotes =
    useMemo(() => {
      if (!reveal) {
        return 0;
      }

      return reveal.results.reduce(
        (sum, item) =>
          sum + item.votes,
        0
      );
    }, [reveal]);

  const maxVotes =
    useMemo(() => {
      if (!reveal) {
        return 0;
      }

      return Math.max(
        0,
        ...reveal.results.map(
          (item) =>
            item.votes
        )
      );
    }, [reveal]);

  const finalRound =
    reveal
      ? reveal.round_number >=
        reveal.total_rounds
      : false;

  useEffect(() => {
    if (
      loading ||
      !reveal ||
      revealSoundPlayed.current
    ) {
      return;
    }

    revealSoundPlayed.current =
      true;

    const timer =
      window.setTimeout(
        () => {
          playSound(
            "reveal",
            0.8
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
    reveal,
  ]);

  useEffect(() => {
    if (
      loading ||
      !reveal ||
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
        950
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    loading,
    reveal,
  ]);

  useEffect(() => {
    if (
      loading ||
      !reveal ||
      !finalRound ||
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
            0.8
          );
        },
        1500
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    loading,
    reveal,
    finalRound,
  ]);

  async function handleContinue() {
    if (
      !roomId ||
      !me?.is_host ||
      continuing
    ) {
      return;
    }

    setContinuing(true);
    setError(null);

    try {
      const next =
        await finishWhoWouldRound(
          roomId
        );

      if (
        next === "ended"
      ) {
        playSound(
          "winner",
          0.85
        );

        router.replace(
          `/who-would/results/${roomId}`
        );
      } else {
        playSound(
          "new-round",
          0.75
        );

        router.replace(
          `/who-would/question/${roomId}`
        );
      }
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće nastaviti."
            : "Could not continue.")
      );

      setContinuing(
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
            className="text-6xl"
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
            🎉
          </motion.div>

          <p className="mt-4 text-white/50">
            {language === "hr"
              ? "Otkrivanje rezultata..."
              : "Revealing results..."}
          </p>
        </motion.div>
      </main>
    );
  }

  if (
    error &&
    !reveal
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
    !question ||
    !reveal ||
    !room ||
    !me
  ) {
    return null;
  }

  const text =
    language === "hr"
      ? question.question_hr
      : question.question_en;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-5 p-6 pb-8">
      <motion.div
        className="text-center pt-4"
        initial={{
          opacity: 0,
          y: -20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          😂 WHO WOULD?
        </p>

        <p className="mt-2 text-sm text-white/35">
          {language === "hr"
            ? "RUNDA"
            : "ROUND"}{" "}
          {reveal.round_number}
          {" / "}
          {reveal.total_rounds}
        </p>

        <motion.h1
          className="mt-4 text-2xl font-black leading-snug"
          initial={{
            opacity: 0,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 0.2,
          }}
        >
          {text}
        </motion.h1>
      </motion.div>

      <section className="flex flex-col gap-3">
        {reveal.results.map(
          (
            player,
            index
          ) => {
            const winner =
              player.votes ===
                maxVotes &&
              maxVotes > 0;

            const percent =
              totalVotes > 0
                ? Math.round(
                    (player.votes /
                      totalVotes) *
                      100
                  )
                : 0;

            return (
              <motion.div
                key={
                  player.player_id
                }
                className={`relative overflow-hidden rounded-2xl border p-4 ${
                  winner
                    ? "border-accent bg-accent/15 shadow-lg shadow-accent/10"
                    : "border-white/10 bg-panel2"
                }`}
                initial={{
                  opacity: 0,
                  y: 20,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                transition={{
                  delay:
                    0.3 +
                    index * 0.08,
                }}
              >
                {winner && (
                  <motion.div
                    className="absolute right-3 top-2 text-xl"
                    initial={{
                      opacity: 0,
                      scale: 0,
                      rotate: -15,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotate: 0,
                    }}
                    transition={{
                      delay:
                        0.8 +
                        index *
                          0.08,
                      type:
                        "spring",
                    }}
                  >
                    👑
                  </motion.div>
                )}

                <div className="flex items-center gap-3">
                  <motion.span
                    className="text-3xl"
                    initial={{
                      scale: 0.7,
                    }}
                    animate={{
                      scale:
                        winner
                          ? [
                              1,
                              1.12,
                              1,
                            ]
                          : 1,
                    }}
                    transition={{
                      delay:
                        0.45 +
                        index *
                          0.08,
                    }}
                  >
                    {player.avatar}
                  </motion.span>

                  <span className="min-w-0 flex-1 truncate font-black">
                    {player.nickname}
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
                        0.6 +
                        index *
                          0.08,
                      type:
                        "spring",
                    }}
                  >
                    {player.votes}
                  </motion.span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={{
                      width: "0%",
                    }}
                    animate={{
                      width:
                        `${percent}%`,
                    }}
                    transition={{
                      delay:
                        0.55 +
                        index *
                          0.08,
                      duration: 0.65,
                    }}
                  />
                </div>

                <motion.p
                  className="mt-2 text-right text-xs text-white/35"
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  transition={{
                    delay:
                      0.9 +
                      index *
                        0.08,
                  }}
                >
                  {percent}%
                </motion.p>
              </motion.div>
            );
          }
        )}
      </section>

      {maxVotes === 0 && (
        <motion.div
          className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
        >
          <p className="text-sm text-white/40">
            {language === "hr"
              ? "Nitko nije dobio glas."
              : "Nobody received a vote."}
          </p>
        </motion.div>
      )}

      {finalRound && (
        <motion.div
          className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-center"
          initial={{
            opacity: 0,
            scale: 0.9,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 1.15,
          }}
        >
          <p className="font-black text-yellow-300">
            🏆{" "}
            {language === "hr"
              ? "ZADNJA RUNDA!"
              : "FINAL ROUND!"}
          </p>

          <p className="mt-2 text-sm text-white/40">
            {language === "hr"
              ? "Sljedeće otvaramo završne rezultate."
              : "Final results are next."}
          </p>
        </motion.div>
      )}

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <motion.div
        className="mt-auto"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 1,
        }}
      >
        {me.is_host ? (
          <Button
            onClick={
              handleContinue
            }
            disabled={
              continuing
            }
          >
            {continuing
              ? language === "hr"
                ? "UČITAVANJE..."
                : "LOADING..."
              : finalRound
              ? language === "hr"
                ? "🏆 ZAVRŠNI REZULTATI"
                : "🏆 FINAL RESULTS"
              : language === "hr"
              ? "➡️ SLJEDEĆA RUNDA"
              : "➡️ NEXT ROUND"}
          </Button>
        ) : (
          <p className="text-center text-sm text-white/35">
            {language === "hr"
              ? "Čekamo hosta..."
              : "Waiting for host..."}
          </p>
        )}
      </motion.div>
    </main>
  );
}