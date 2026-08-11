"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  AnimatePresence,
  motion,
} from "motion/react";

import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";

import {
  playSound,
  stopSound,
} from "@/lib/sounds";

import { supabase } from "@/lib/supabase";

import {
  getBombGameState,
  resolveBombIfDue,
  submitBombAnswer,
  type BombGameState,
} from "@/lib/bomb";

export default function BombGamePage() {
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
    state,
    setState,
  ] =
    useState<BombGameState | null>(
      null
    );

  const [
    answer,
    setAnswer,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    explodedPlayerId,
    setExplodedPlayerId,
  ] =
    useState<string | null>(
      null
    );

  const [
    explosionVisible,
    setExplosionVisible,
  ] = useState(false);

  const [
    passVisible,
    setPassVisible,
  ] = useState(false);

  const [
    lastPassedTo,
    setLastPassedTo,
  ] =
    useState<string | null>(
      null
    );

  const [
    tickSpeed,
    setTickSpeed,
  ] = useState(900);

  const resolvingRef =
    useRef(false);

  const previousHolderRef =
    useRef<string | null>(
      null
    );

  const previousRoundRef =
    useRef<number | null>(
      null
    );

  const loadState =
    useCallback(
      async (
        silent = false
      ) => {
        if (!roomId) {
          return;
        }

        try {
          if (!silent) {
            setLoading(true);
          }

          const fresh =
            await getBombGameState(
              roomId
            );

          setState(fresh);

          if (
            fresh.status ===
            "ended"
          ) {
            router.replace(
              `/bomb/results/${roomId}`
            );
          }
        } catch (e: any) {
          if (!silent) {
            setError(
              e?.message ??
                (language === "hr"
                  ? "Nije moguće učitati Bomb."
                  : "Could not load Bomb.")
            );
          }
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      },
      [
        roomId,
        router,
        language,
      ]
    );

  useEffect(() => {
    void loadState();
  }, [
    loadState,
  ]);

  /*
   * Realtime room changes.
   */

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const roomChannel =
      supabase
        .channel(
          `bomb-game-room-${roomId}`
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
          () => {
            void loadState(true);
          }
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        roomChannel
      );
    };
  }, [
    roomId,
    loadState,
  ]);

  /*
   * Realtime player life changes.
   */

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const playerChannel =
      supabase
        .channel(
          `bomb-game-players-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bomb_players",
            filter:
              `room_id=eq.${roomId}`,
          },
          () => {
            void loadState(true);
          }
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        playerChannel
      );
    };
  }, [
    roomId,
    loadState,
  ]);

  /*
   * Detect bomb passing and new rounds.
   */

  useEffect(() => {
    if (!state) {
      return;
    }

    if (
      previousHolderRef.current &&
      previousHolderRef.current !==
        state.current_holder_player_id &&
      previousRoundRef.current ===
        state.round_number
    ) {
      setPassVisible(true);

      const next =
        state.players.find(
          (player) =>
            player.id ===
            state.current_holder_player_id
        );

      setLastPassedTo(
        next?.nickname ??
          null
      );

      const timer =
        window.setTimeout(
          () => {
            setPassVisible(
              false
            );
          },
          900
        );

      previousHolderRef.current =
        state.current_holder_player_id;

      return () => {
        window.clearTimeout(
          timer
        );
      };
    }

    previousHolderRef.current =
      state.current_holder_player_id;

    previousRoundRef.current =
      state.round_number;
  }, [
    state,
  ]);

  /*
   * Tick sound.
   *
   * The actual countdown stays hidden.
   * Tick becomes faster as server deadline approaches.
   */

  useEffect(() => {
    if (
      !state ||
      state.status !==
        "playing" ||
      !state.bomb_explodes_at
    ) {
      stopSound("tick");
      return;
    }

    function calculateSpeed() {
      const end =
        new Date(
          state!.bomb_explodes_at!
        ).getTime();

      const remaining =
        Math.max(
          0,
          end - Date.now()
        );

      if (remaining <= 3000) {
        return 220;
      }

      if (remaining <= 6000) {
        return 350;
      }

      if (remaining <= 10000) {
        return 500;
      }

      return 900;
    }

    setTickSpeed(
      calculateSpeed()
    );

    const speedCheck =
      window.setInterval(
        () => {
          setTickSpeed(
            calculateSpeed()
          );
        },
        250
      );

    return () => {
      window.clearInterval(
        speedCheck
      );

      stopSound("tick");
    };
  }, [
    state,
  ]);

  useEffect(() => {
    if (
      !state ||
      state.status !==
        "playing"
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          playSound(
            "tick",
            0.45
          );

          window.setTimeout(
            () => {
              stopSound(
                "tick"
              );
            },
            120
          );
        },
        tickSpeed
      );

    return () => {
      window.clearInterval(
        timer
      );

      stopSound(
        "tick"
      );
    };
  }, [
    state?.status,
    tickSpeed,
  ]);

  /*
   * Ask server whether bomb exploded.
   *
   * Multiple phones may call this.
   * Backend row locking makes it safe.
   */

  useEffect(() => {
    if (
      !roomId ||
      !state ||
      state.status !==
        "playing"
    ) {
      return;
    }

    const timer =
      window.setInterval(
        async () => {
          if (
            resolvingRef.current
          ) {
            return;
          }

          resolvingRef.current =
            true;

          try {
            const result =
              await resolveBombIfDue(
                roomId
              );

            if (
              result.resolved
            ) {
              if (
                result.exploded_player_id
              ) {
                setExplodedPlayerId(
                  result.exploded_player_id
                );

                setExplosionVisible(
                  true
                );

                playSound(
                  "reveal",
                  1
                );

                if (
                  "vibrate" in
                  navigator
                ) {
                  navigator.vibrate([
                    150,
                    70,
                    250,
                    70,
                    400,
                  ]);
                }

                window.setTimeout(
                  () => {
                    setExplosionVisible(
                      false
                    );
                  },
                  1300
                );
              }

              if (
                result.status ===
                "ended"
              ) {
                window.setTimeout(
                  () => {
                    router.replace(
                      `/bomb/results/${roomId}`
                    );
                  },
                  1500
                );

                return;
              }

              setAnswer("");

              await loadState(
                true
              );
            }
          } catch (e) {
            console.error(
              "Bomb resolve failed:",
              e
            );
          } finally {
            resolvingRef.current =
              false;
          }
        },
        300
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    roomId,
    state,
    router,
    loadState,
  ]);

  async function handleSubmit(
    event?: FormEvent
  ) {
    event?.preventDefault();

    if (
      !roomId ||
      !state?.is_my_turn ||
      !answer.trim() ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result =
        await submitBombAnswer(
          roomId,
          answer.trim()
        );

      playSound(
        "click",
        0.65
      );

      setAnswer("");

      if (
        result.status ===
        "ended"
      ) {
        router.replace(
          `/bomb/results/${roomId}`
        );

        return;
      }

      await loadState(true);
    } catch (e: any) {
      const raw =
        e?.message ??
        "";

      let message = raw;

      if (
        language === "hr"
      ) {
        if (
          raw.includes(
            "already been used"
          )
        ) {
          message =
            "❌ Taj odgovor je već iskorišten!";
        } else if (
          raw.includes(
            "not accepted"
          )
        ) {
          message =
            "❌ Taj odgovor ne pripada ovoj kategoriji!";
        } else if (
          raw.includes(
            "already exploded"
          )
        ) {
          message =
            "💥 Prekasno! Bomba je eksplodirala.";
        } else if (
          raw.includes(
            "do not have the bomb"
          )
        ) {
          message =
            "Bomba više nije kod tebe.";
        } else if (
          raw.includes(
            "Enter an answer"
          )
        ) {
          message =
            "Upiši odgovor.";
        }
      }

      setError(
        message ||
          (language === "hr"
            ? "Odgovor nije prihvaćen."
            : "Answer was not accepted.")
      );
    } finally {
      setSubmitting(false);
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
                1.1,
                1,
              ],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
            }}
          >
            💣
          </motion.div>

          <p className="mt-5 text-white/50">
            {language === "hr"
              ? "Palimo bombu..."
              : "Lighting the bomb..."}
          </p>
        </motion.div>
      </main>
    );
  }

  if (
    error &&
    !state
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-accent">
          {error}
        </p>
      </main>
    );
  }

  if (!state) {
    return null;
  }

  if (
    state.status ===
    "ended"
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/50">
          {language === "hr"
            ? "Učitavanje rezultata..."
            : "Loading results..."}
        </p>
      </main>
    );
  }

  const me =
    state.players.find(
      (player) =>
        player.id ===
        state.my_player_id
    ) ?? null;

  const holder =
    state.players.find(
      (player) =>
        player.id ===
        state.current_holder_player_id
    ) ?? null;

  const explodedPlayer =
    state.players.find(
      (player) =>
        player.id ===
        explodedPlayerId
    ) ?? null;

  const categoryName =
    language === "hr"
      ? state.category?.name_hr
      : state.category?.name_en;

  const alivePlayers =
    state.players.filter(
      (player) =>
        player.is_alive
    );

  return (
    <motion.main
      className="relative min-h-screen max-w-md mx-auto flex flex-col gap-5 overflow-hidden p-6"
      animate={
        explosionVisible
          ? {
              x: [
                0,
                -12,
                12,
                -10,
                10,
                -6,
                6,
                0,
              ],
            }
          : {
              x: 0,
            }
      }
      transition={{
        duration: 0.55,
      }}
    >
      <AnimatePresence>
        {explosionVisible && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-red-600/80"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [
                0,
                1,
                0.85,
                1,
              ],
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.75,
            }}
          >
            <motion.div
              className="text-center"
              initial={{
                scale: 0.2,
              }}
              animate={{
                scale: [
                  0.2,
                  1.5,
                  1,
                ],
              }}
            >
              <div className="text-9xl">
                💥
              </div>

              <h1 className="mt-4 text-6xl font-black">
                BOOM!
              </h1>

              {explodedPlayer && (
                <p className="mt-3 text-xl font-black">
                  {explodedPlayer.avatar}{" "}
                  {
                    explodedPlayer.nickname
                  }
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {passVisible && (
          <motion.div
            className="pointer-events-none fixed left-1/2 top-[18%] z-[150] -translate-x-1/2 rounded-full border border-white/15 bg-black/80 px-5 py-3 text-sm font-black shadow-2xl backdrop-blur-xl"
            initial={{
              opacity: 0,
              y: -20,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -10,
            }}
          >
            💣 →{" "}
            {lastPassedTo ??
              (language === "hr"
                ? "sljedeći igrač"
                : "next player")}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="text-center pt-4">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">
          💣 BOMB
        </p>

        <p className="mt-2 text-sm text-white/35">
          {language === "hr"
            ? "RUNDA"
            : "ROUND"}{" "}
          {state.round_number}
        </p>
      </header>

      <motion.section
        className="rounded-3xl border border-accent/25 bg-accent/10 p-6 text-center"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <div className="text-5xl">
          {state.category?.emoji ??
            "💣"}
        </div>

        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-white/35">
          {language === "hr"
            ? "KATEGORIJA"
            : "CATEGORY"}
        </p>

        <h1 className="mt-2 text-3xl font-black">
          {categoryName ??
            "..."}
        </h1>
      </motion.section>

      <section className="text-center">
        {state.is_my_turn ? (
          <motion.div
            key="mine"
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
          >
            <motion.div
              className="text-9xl"
              animate={{
                rotate: [
                  -4,
                  4,
                  -4,
                ],
                scale: [
                  1,
                  1.06,
                  1,
                ],
              }}
              transition={{
                duration: 0.45,
                repeat: Infinity,
              }}
            >
              💣
            </motion.div>

            <h2 className="mt-4 text-3xl font-black text-red-300">
              {language === "hr"
                ? "BOMBA JE KOD TEBE!"
                : "YOU HAVE THE BOMB!"}
            </h2>

            <p className="mt-2 text-sm text-white/45">
              {language === "hr"
                ? "Brzo upiši valjan odgovor."
                : "Quickly type a valid answer."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="other"
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
                duration: 0.8,
                repeat: Infinity,
              }}
            >
              💣
            </motion.div>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-white/35">
              {language === "hr"
                ? "BOMBU DRŽI"
                : "BOMB HOLDER"}
            </p>

            <h2 className="mt-2 text-2xl font-black">
              {holder?.avatar}{" "}
              {holder?.nickname ??
                "..."}
            </h2>
          </motion.div>
        )}

        <motion.p
          className="mt-5 font-black text-accent"
          animate={{
            opacity: [
              0.45,
              1,
              0.45,
            ],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          ⏱️{" "}
          {language === "hr"
            ? "KADA ĆE EKSPLODIRATI?"
            : "WHEN WILL IT EXPLODE?"}
        </motion.p>
      </section>

      {me?.is_alive &&
        state.is_my_turn && (
          <form
            onSubmit={
              handleSubmit
            }
            className="flex flex-col gap-3"
          >
            <input
              value={answer}
              onChange={(event) =>
                setAnswer(
                  event.target.value
                )
              }
              disabled={
                submitting
              }
              autoFocus
              autoComplete="off"
              maxLength={40}
              placeholder={
                language === "hr"
                  ? "Upiši odgovor..."
                  : "Type an answer..."
              }
              className="input text-center text-xl font-black"
            />

            <Button
              type="submit"
              disabled={
                submitting ||
                !answer.trim()
              }
            >
              {submitting
                ? language === "hr"
                  ? "PROVJERA..."
                  : "CHECKING..."
                : language === "hr"
                ? "💣 POŠALJI BOMBU"
                : "💣 PASS THE BOMB"}
            </Button>
          </form>
        )}

      {!me?.is_alive && (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-center">
          <p className="font-black text-red-300">
            💀{" "}
            {language === "hr"
              ? "ISPAO SI"
              : "YOU'RE OUT"}
          </p>

          <p className="mt-2 text-sm text-white/40">
            {language === "hr"
              ? "Možeš gledati ostatak igre."
              : "You can watch the rest of the game."}
          </p>
        </div>
      )}

      {error && (
        <motion.p
          key={error}
          className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-center text-sm font-bold text-red-300"
          initial={{
            opacity: 0,
            x: -8,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
        >
          {error}
        </motion.p>
      )}

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
            {language === "hr"
              ? "IGRAČI"
              : "PLAYERS"}
          </p>

          <p className="text-xs text-white/30">
            {alivePlayers.length}/
            {state.players.length}{" "}
            {language === "hr"
              ? "živih"
              : "alive"}
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {state.players.map(
            (player) => {
              const hasBomb =
                player.id ===
                state.current_holder_player_id;

              return (
                <motion.div
                  key={player.id}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${
                    hasBomb
                      ? "border-red-400/40 bg-red-400/10"
                      : player.is_alive
                      ? "border-white/10 bg-black/20"
                      : "border-white/5 bg-black/10 opacity-40"
                  }`}
                  animate={
                    hasBomb
                      ? {
                          scale: [
                            1,
                            1.015,
                            1,
                          ],
                        }
                      : {}
                  }
                  transition={{
                    duration: 0.55,
                    repeat:
                      hasBomb
                        ? Infinity
                        : 0,
                  }}
                >
                  <span className="text-2xl">
                    {player.avatar}
                  </span>

                  <span className="min-w-0 flex-1 truncate font-bold">
                    {player.nickname}

                    {player.id ===
                      state.my_player_id && (
                      <span className="text-white/30">
                        {" "}
                        {language ===
                        "hr"
                          ? "(ti)"
                          : "(you)"}
                      </span>
                    )}
                  </span>

                  <span className="text-sm">
                    {player.is_alive
                      ? Array.from({
                          length:
                            player.lives,
                        })
                          .map(
                            () => "❤️"
                          )
                          .join("")
                      : "💀"}
                  </span>

                  {hasBomb && (
                    <span className="text-xl">
                      💣
                    </span>
                  )}
                </motion.div>
              );
            }
          )}
        </div>
      </section>

      <section className="pb-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">
          {language === "hr"
            ? "ISKORIŠTENI ODGOVORI"
            : "USED ANSWERS"}
        </p>

        {state.used_answers.length ===
        0 ? (
          <p className="mt-2 text-sm text-white/25">
            {language === "hr"
              ? "Još nema odgovora."
              : "No answers yet."}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {state.used_answers.map(
              (
                item,
                index
              ) => (
                <span
                  key={`${item.player_id}-${index}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50"
                >
                  {item.answer}
                </span>
              )
            )}
          </div>
        )}
      </section>
    </motion.main>
  );
}