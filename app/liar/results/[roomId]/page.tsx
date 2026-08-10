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
  getLiarRoomById,
  getMyLiarPlayerInRoom,
  rematchLiarGame,
  type LiarPlayer,
  type LiarRoom,
} from "@/lib/liar";

export default function LiarResultsPage() {
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

  const [room, setRoom] =
    useState<LiarRoom | null>(
      null
    );

  const [me, setMe] =
    useState<LiarPlayer | null>(
      null
    );

  const [players, setPlayers] =
    useState<LiarPlayer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [rematching, setRematching] =
    useState(false);

  const [error, setError] =
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
          freshRoom,
          freshMe,
        ] = await Promise.all([
          getLiarRoomById(
            roomId
          ),
          getMyLiarPlayerInRoom(
            roomId
          ),
        ]);

        const {
          data,
          error,
        } = await supabase
          .from(
            "liar_players"
          )
          .select("*")
          .eq(
            "room_id",
            roomId
          )
          .order(
            "score",
            {
              ascending: false,
            }
          )
          .order(
            "joined_at",
            {
              ascending: true,
            }
          );

        if (error) {
          throw new Error(
            error.message
          );
        }

        if (
          cancelled ||
          !freshRoom ||
          !freshMe
        ) {
          return;
        }

        setRoom(
          freshRoom
        );

        setMe(
          freshMe
        );

        setPlayers(
          (data ??
            []) as LiarPlayer[]
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              "Could not load results."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `liar-results-room-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "liar_rooms",
            filter:
              `id=eq.${roomId}`,
          },
          (payload) => {
            const updated =
              payload.new as LiarRoom;

            setRoom(
              updated
            );

            if (
              updated.status ===
              "waiting"
            ) {
              router.replace(
                `/liar/room/${updated.code}`
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

  const winner =
    useMemo(
      () =>
        players[0] ??
        null,
      [players]
    );

  useEffect(() => {
    if (
      loading ||
      !winner ||
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
        350
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    loading,
    winner,
  ]);

  useEffect(() => {
    if (
      loading ||
      players.length === 0 ||
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
    players,
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

      await rematchLiarGame(
        roomId
      );

      if (room) {
        router.replace(
          `/liar/room/${room.code}`
        );
      }
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće pokrenuti novu igru."
            : "Could not start rematch.")
      );

      setRematching(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-white/50">
          {language === "hr"
            ? "Učitavanje rezultata..."
            : "Loading results..."}
        </p>
      </main>
    );
  }

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
        transition={{
          duration: 0.4,
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
            stiffness: 220,
            damping: 13,
          }}
        >
          🏆
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
          LIAR
        </motion.p>

        <motion.h1
          className="mt-2 text-3xl font-black"
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.45,
          }}
        >
          {language === "hr"
            ? "ZAVRŠNI REZULTATI"
            : "FINAL RESULTS"}
        </motion.h1>
      </motion.div>

      {winner && (
        <motion.section
          className="relative overflow-hidden rounded-3xl border border-yellow-400/25 bg-yellow-400/10 p-7 text-center"
          initial={{
            opacity: 0,
            scale: 0.8,
            y: 30,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{
            delay: 0.55,
            type: "spring",
            stiffness: 170,
            damping: 14,
          }}
        >
          <motion.div
            className="absolute left-5 top-5 text-2xl"
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
            className="absolute right-5 top-7 text-xl"
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
              ? "POBJEDNIK"
              : "WINNER"}
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
              damping: 12,
            }}
          >
            {winner.avatar}
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
            {winner.nickname}
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
            {winner.score} pts
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
          delay: 1.05,
        }}
      >
        <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-white/35">
          {language === "hr"
            ? "KONAČNI POREDAK"
            : "FINAL STANDINGS"}
        </p>

        <div className="flex flex-col gap-2">
          {players.map(
            (
              player,
              index
            ) => (
              <motion.div
                key={
                  player.id
                }
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  index === 0
                    ? "border-yellow-400/25 bg-yellow-400/10"
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
                    1.15 +
                    index *
                      0.08,
                }}
              >
                <motion.span
                  className="w-7 text-center font-black text-white/35"
                  initial={{
                    scale: 0.7,
                  }}
                  animate={{
                    scale: 1,
                  }}
                  transition={{
                    delay:
                      1.2 +
                      index *
                        0.08,
                    type:
                      "spring",
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
                    me?.id && (
                    <span className="ml-1 text-xs font-normal text-white/30">
                      {language ===
                      "hr"
                        ? "(ti)"
                        : "(you)"}
                    </span>
                  )}
                </span>

                <motion.span
                  className={`font-black ${
                    index === 0
                      ? "text-yellow-300"
                      : "text-accent"
                  }`}
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
                        0.08,
                    type:
                      "spring",
                  }}
                >
                  {player.score}
                </motion.span>
              </motion.div>
            )
          )}
        </div>
      </motion.section>

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-3">
        {me?.is_host && (
          <Button
            onClick={
              handleRematch
            }
            disabled={
              rematching
            }
          >
            {rematching
              ? language ===
                "hr"
                ? "POKRETANJE..."
                : "STARTING..."
              : language ===
                "hr"
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
      </div>
    </main>
  );
}