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
  getBombFinalResults,
  getBombRoomById,
  getMyBombPlayerInRoom,
  rematchBombGame,
  type BombFinalResults,
  type BombPlayer,
  type BombRoom,
} from "@/lib/bomb";

export default function BombResultsPage() {
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
    useState<BombFinalResults | null>(
      null
    );

  const [
    room,
    setRoom,
  ] =
    useState<BombRoom | null>(
      null
    );

  const [
    me,
    setMe,
  ] =
    useState<BombPlayer | null>(
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
            getBombFinalResults(
              roomId
            ),
            getBombRoomById(
              roomId
            ),
            getMyBombPlayerInRoom(
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
          setLoading(false);
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
          `bomb-results-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bomb_rooms",
            filter:
              `id=eq.${roomId}`,
          },
          (payload) => {
            const updated =
              payload.new as BombRoom;

            setRoom(
              updated
            );

            if (
              updated.status ===
                "waiting"
            ) {
              router.replace(
                `/bomb/room/${updated.code}`
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

  const winner =
    useMemo(() => {
      if (!results) {
        return null;
      }

      return (
        results.players.find(
          (player) =>
            player.id ===
            results.winner_player_id
        ) ?? null
      );
    }, [results]);

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
      await rematchBombGame(
        roomId
      );

      playSound(
        "new-round",
        0.7
      );

      if (room) {
        router.replace(
          `/bomb/room/${room.code}`
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
            className="text-8xl"
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

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6 pb-8">
      <motion.header
        className="text-center pt-6"
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
          className="text-8xl"
          initial={{
            scale: 0,
            rotate: -15,
          }}
          animate={{
            scale: 1,
            rotate: 0,
          }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 12,
          }}
        >
          🏆
        </motion.div>

        <p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-accent">
          💣 BOMB
        </p>

        <h1 className="mt-2 text-4xl font-black">
          {language === "hr"
            ? "KRAJ IGRE"
            : "GAME OVER"}
        </h1>

        <p className="mt-2 text-sm text-white/35">
          {language === "hr"
            ? `Odigrano rundi: ${results.rounds_played}`
            : `Rounds played: ${results.rounds_played}`}
        </p>
      </motion.header>

      {winner && (
        <motion.section
          className="relative overflow-hidden rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-8 text-center shadow-2xl shadow-yellow-400/10"
          initial={{
            opacity: 0,
            scale: 0.85,
            y: 25,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{
            delay: 0.25,
            type: "spring",
            stiffness: 160,
          }}
        >
          <motion.div
            className="absolute left-5 top-5"
            animate={{
              rotate: [
                -10,
                10,
                -10,
              ],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
            }}
          >
            ✨
          </motion.div>

          <motion.div
            className="absolute right-5 top-5"
            animate={{
              rotate: [
                10,
                -10,
                10,
              ],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
            }}
          >
            ✨
          </motion.div>

          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
            BOMB MASTER
          </p>

          <motion.div
            className="mt-5 text-7xl"
            initial={{
              scale: 0,
            }}
            animate={{
              scale: 1,
            }}
            transition={{
              delay: 0.45,
              type: "spring",
              stiffness: 230,
            }}
          >
            {winner.avatar}
          </motion.div>

          <h2 className="mt-4 text-3xl font-black">
            {winner.nickname}
          </h2>

          <p className="mt-3 text-xl font-black text-yellow-300">
            👑{" "}
            {language === "hr"
              ? "PREŽIVIO BOMBU"
              : "SURVIVED THE BOMB"}
          </p>

          <div className="mt-4">
            {winner.lives > 0
              ? Array.from({
                  length:
                    winner.lives,
                })
                  .map(
                    () => "❤️"
                  )
                  .join("")
              : "💀"}
          </div>
        </motion.section>
      )}

      <motion.section
        className="card p-5"
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.5,
        }}
      >
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
          {language === "hr"
            ? "KONAČNI POREDAK"
            : "FINAL STANDINGS"}
        </h2>

        <div className="mt-4 flex flex-col gap-2">
          {results.players.map(
            (
              player,
              index
            ) => {
              const isWinner =
                player.id ===
                results.winner_player_id;

              return (
                <motion.div
                  key={player.id}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                    isWinner
                      ? "border-yellow-400/30 bg-yellow-400/10"
                      : "border-white/10 bg-black/20"
                  }`}
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
                      0.6 +
                      index *
                        0.07,
                  }}
                >
                  <span className="w-8 text-center font-black">
                    {index === 0
                      ? "🥇"
                      : index === 1
                      ? "🥈"
                      : index === 2
                      ? "🥉"
                      : `${index + 1}.`}
                  </span>

                  <span className="text-3xl">
                    {player.avatar}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">
                      {player.nickname}

                      {player.id ===
                        me.id && (
                        <span className="ml-1 text-xs font-normal text-white/30">
                          {language === "hr"
                            ? "(ti)"
                            : "(you)"}
                        </span>
                      )}
                    </p>

                    <p className="mt-1 text-xs text-white/35">
                      {isWinner
                        ? "👑 BOMB MASTER"
                        : player.is_alive
                        ? language === "hr"
                          ? "Preživio"
                          : "Survived"
                        : language === "hr"
                        ? "Eliminiran"
                        : "Eliminated"}
                    </p>
                  </div>

                  <span className="text-sm">
                    {player.lives > 0
                      ? Array.from({
                          length:
                            player.lives,
                        })
                          .map(
                            () =>
                              "❤️"
                          )
                          .join("")
                      : "💀"}
                  </span>
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
        className="mt-auto flex flex-col gap-3"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.8,
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
          onClick={() =>
            router.push("/")
          }
        >
          🏠 PARTY GAMES
        </Button>
      </motion.div>
    </main>
  );
}