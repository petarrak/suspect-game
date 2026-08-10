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
  checkMafiaWinner,
  getMafiaRoomById,
  getMafiaVoteReveal,
  getMyMafiaPlayerInRoom,
  nextMafiaNight,
  type MafiaPlayer,
  type MafiaRoom,
  type MafiaVoteReveal,
} from "@/lib/mafia";

export default function MafiaRevealPage() {
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
    reveal,
    setReveal,
  ] =
    useState<MafiaVoteReveal | null>(
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
    winner,
    setWinner,
  ] = useState<
    "MAFIA" | "CIVILIANS" | null
  >(null);

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

  const outcomeSoundPlayed =
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
          freshReveal,
          freshRoom,
          freshMe,
        ] =
          await Promise.all([
            getMafiaVoteReveal(
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
              ? "Nije moguće učitati reveal."
              : "Could not load reveal."
          );
        }

        setReveal(
          freshReveal
        );

        setRoom(
          freshRoom
        );

        setMe(
          freshMe
        );

        const result =
          await checkMafiaWinner(
            roomId
          );

        if (cancelled) {
          return;
        }

        setWinner(
          result
        );

        /*
         * Ako je igra završila, ostavimo reveal
         * kratko na ekranu prije final resultsa.
         */
        if (result) {
          window.setTimeout(
            () => {
              if (
                !winnerSoundPlayed.current
              ) {
                winnerSoundPlayed.current =
                  true;

                playSound(
                  "winner",
                  0.85
                );
              }

              router.replace(
                `/mafia/results/${roomId}`
              );
            },
            2600
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati rezultat glasanja."
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
        200
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
      outcomeSoundPlayed.current
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          outcomeSoundPlayed.current =
            true;

          if (
            reveal.tied
          ) {
            playSound(
              "click",
              0.65
            );
          } else {
            playSound(
              "caught",
              0.85
            );
          }
        },
        1000
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
    if (!roomId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `mafia-reveal-room-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "mafia_rooms",
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
              "night"
            ) {
              router.replace(
                `/mafia/night/${roomId}`
              );
            }

            if (
              updated.status ===
              "ended"
            ) {
              if (
                !winnerSoundPlayed.current
              ) {
                winnerSoundPlayed.current =
                  true;

                playSound(
                  "winner",
                  0.85
                );
              }

              router.replace(
                `/mafia/results/${roomId}`
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
        await nextMafiaNight(
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
          `/mafia/results/${roomId}`
        );
      } else {
        playSound(
          "new-round",
          0.75
        );

        router.replace(
          `/mafia/night/${roomId}`
        );
      }
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće nastaviti igru."
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
            className="text-7xl"
            animate={{
              scale: [
                1,
                1.1,
                1,
              ],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
            }}
          >
            🗳️
          </motion.div>

          <p className="mt-4 text-white/50">
            {language === "hr"
              ? "Otkrivanje glasova..."
              : "Revealing votes..."}
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
    !reveal ||
    !room ||
    !me
  ) {
    return null;
  }

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
          ☀️{" "}
          {language === "hr"
            ? "DAN"
            : "DAY"}{" "}
          {reveal.day_number}
        </p>

        <h1 className="mt-2 text-3xl font-black">
          🗳️{" "}
          {language === "hr"
            ? "REZULTAT GLASANJA"
            : "VOTE RESULT"}
        </h1>
      </motion.div>

      {reveal.tied ? (
        <motion.section
          className="rounded-3xl border border-yellow-400/25 bg-yellow-400/10 p-8 text-center"
          initial={{
            opacity: 0,
            scale: 0.75,
            y: 30,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{
            delay: 0.45,
            type: "spring",
            stiffness: 170,
            damping: 14,
          }}
        >
          <motion.div
            className="text-6xl"
            initial={{
              rotate: -30,
              scale: 0,
            }}
            animate={{
              rotate: 0,
              scale: 1,
            }}
            transition={{
              delay: 0.65,
              type: "spring",
              stiffness: 220,
            }}
          >
            ⚖️
          </motion.div>

          <motion.h2
            className="mt-4 text-2xl font-black text-yellow-300"
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.8,
            }}
          >
            {language === "hr"
              ? "IZJEDNAČENO"
              : "IT'S A TIE"}
          </motion.h2>

          <motion.p
            className="mt-3 text-white/50"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.95,
            }}
          >
            {language === "hr"
              ? "Nitko nije eliminiran."
              : "Nobody was eliminated."}
          </motion.p>
        </motion.section>
      ) : (
        <motion.section
          className="relative overflow-hidden rounded-3xl border border-red-400/25 bg-red-400/10 p-8 text-center"
          initial={{
            opacity: 0,
            scale: 0.75,
            y: 30,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{
            delay: 0.45,
            type: "spring",
            stiffness: 170,
            damping: 14,
          }}
        >
          <motion.div
            className="text-3xl"
            initial={{
              opacity: 0,
              scale: 2,
            }}
            animate={{
              opacity: [
                0,
                1,
                0.4,
              ],
              scale: [
                2,
                1,
                1,
              ],
            }}
            transition={{
              delay: 0.55,
              duration: 0.5,
            }}
          >
            💀
          </motion.div>

          <motion.div
            className="mt-3 text-6xl"
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
              delay: 0.75,
              type: "spring",
              stiffness: 210,
              damping: 13,
            }}
          >
            {reveal.eliminated_avatar}
          </motion.div>

          <motion.p
            className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-white/35"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.9,
            }}
          >
            {language === "hr"
              ? "ELIMINIRAN JE"
              : "ELIMINATED"}
          </motion.p>

          <motion.h2
            className="mt-2 text-3xl font-black"
            initial={{
              opacity: 0,
              y: 15,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              delay: 1,
              type: "spring",
            }}
          >
            {reveal.eliminated_nickname}
          </motion.h2>

          <motion.p
            className="mt-3 font-black text-red-300"
            initial={{
              opacity: 0,
              scale: 0.7,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              delay: 1.15,
              type: "spring",
            }}
          >
            💀{" "}
            {language === "hr"
              ? "IZBAČEN IZ IGRE"
              : "OUT OF THE GAME"}
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
          delay: 1.2,
        }}
      >
        <h3 className="font-black">
          🗳️{" "}
          {language === "hr"
            ? "GLASOVI"
            : "VOTES"}
        </h3>

        <div className="mt-4 flex flex-col gap-2">
          {reveal.votes.length ===
          0 ? (
            <p className="text-sm text-white/35">
              {language === "hr"
                ? "Nitko nije glasao."
                : "Nobody voted."}
            </p>
          ) : (
            reveal.votes.map(
              (
                vote,
                index
              ) => (
                <motion.div
                  key={
                    vote.voter_player_id
                  }
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
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
                      1.3 +
                      index *
                        0.08,
                  }}
                >
                  <span className="text-xl">
                    {vote.voter_avatar}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {vote.voter_nickname}
                    </p>

                    <p className="truncate text-xs text-white/35">
                      →{" "}
                      {vote.target_avatar}{" "}
                      {vote.target_nickname}
                    </p>
                  </div>

                  <motion.span
                    initial={{
                      opacity: 0,
                      x: -5,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay:
                        1.4 +
                        index *
                          0.08,
                    }}
                  >
                    🗳️
                  </motion.span>
                </motion.div>
              )
            )
          )}
        </div>
      </motion.section>

      {winner && (
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
            delay: 1.7,
          }}
        >
          <p className="font-black text-yellow-300">
            🏆{" "}
            {winner === "MAFIA"
              ? language === "hr"
                ? "MAFIJA JE POBIJEDILA!"
                : "MAFIA WINS!"
              : language === "hr"
              ? "CIVILI SU POBIJEDILI!"
              : "CIVILIANS WIN!"}
          </p>

          <p className="mt-2 text-xs text-white/40">
            {language === "hr"
              ? "Otvaranje završnih rezultata..."
              : "Opening final results..."}
          </p>
        </motion.div>
      )}

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      {!winner && (
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
            delay: 1.6,
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
                  ? "PROVJERA..."
                  : "CHECKING..."
                : language === "hr"
                ? "🌙 NASTAVI"
                : "🌙 CONTINUE"}
            </Button>
          ) : (
            <p className="text-center text-sm text-white/35">
              {language === "hr"
                ? "Čekamo hosta..."
                : "Waiting for host..."}
            </p>
          )}
        </motion.div>
      )}
    </main>
  );
}