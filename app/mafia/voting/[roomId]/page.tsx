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

import { useLanguage } from "@/components/LanguageProvider";

import { playSound } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";

import {
  castMafiaVote,
  finishMafiaVotingIfDue,
  getMafiaRoomById,
  getMafiaVoteState,
  type MafiaRoom,
  type MafiaVoteState,
} from "@/lib/mafia";

export default function MafiaVotingPage() {
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
    useState<MafiaRoom | null>(
      null
    );

  const [state, setState] =
    useState<MafiaVoteState | null>(
      null
    );

  const [
    remaining,
    setRemaining,
  ] = useState(0);

  const [
    submitting,
    setSubmitting,
  ] =
    useState<string | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const finishRequested =
    useRef(false);

  const lastTickSecond =
    useRef<number | null>(
      null
    );

  const revealSoundPlayed =
    useRef(false);

  function goToReveal(
    targetRoomId: string
  ) {
    if (
      !revealSoundPlayed.current
    ) {
      revealSoundPlayed.current =
        true;

      playSound(
        "reveal",
        0.75
      );
    }

    router.replace(
      `/mafia/reveal/${targetRoomId}`
    );
  }

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [
          freshRoom,
          freshState,
        ] =
          await Promise.all([
            getMafiaRoomById(
              roomId
            ),
            getMafiaVoteState(
              roomId
            ),
          ]);

        if (cancelled) {
          return;
        }

        if (!freshRoom) {
          throw new Error(
            language === "hr"
              ? "Soba ne postoji."
              : "Room not found."
          );
        }

        setRoom(
          freshRoom
        );

        setState(
          freshState
        );

        if (
          freshRoom.status ===
          "reveal"
        ) {
          goToReveal(
            roomId
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati glasanje."
                : "Could not load voting.")
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
          `mafia-voting-room-${roomId}`
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
              "reveal"
            ) {
              goToReveal(
                roomId
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
      !roomId ||
      room?.status !==
        "voting"
    ) {
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const fresh =
          await getMafiaVoteState(
            roomId
          );

        if (!cancelled) {
          setState(
            fresh
          );

          if (
            fresh.status ===
            "reveal"
          ) {
            goToReveal(
              roomId
            );
          }
        }
      } catch {
        // Realtime + next refresh
        // will try again.
      }
    }

    void refresh();

    const interval =
      window.setInterval(
        refresh,
        1000
      );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval
      );
    };
  }, [
    roomId,
    room?.status,
  ]);

  useEffect(() => {
    if (
      !room ||
      room.status !==
        "voting" ||
      !room.voting_started_at
    ) {
      return;
    }

    finishRequested.current =
      false;

    lastTickSecond.current =
      null;

    const startedAt =
      room.voting_started_at;

    const votingTime =
      room.voting_time;

    const currentRoomId =
      room.id;

    function tick() {
      const endsAt =
        new Date(
          startedAt
        ).getTime() +
        votingTime * 1000;

      const secondsLeft =
        Math.max(
          0,
          Math.ceil(
            (endsAt -
              Date.now()) /
              1000
          )
        );

      setRemaining(
        secondsLeft
      );

      if (
        secondsLeft > 0 &&
        secondsLeft <= 5 &&
        lastTickSecond.current !==
          secondsLeft
      ) {
        lastTickSecond.current =
          secondsLeft;

        playSound(
          "tick",
          0.7
        );
      }

      if (
        secondsLeft <= 0 &&
        !finishRequested.current
      ) {
        finishRequested.current =
          true;

        void finishMafiaVotingIfDue(
          currentRoomId
        )
          .then(
            (didFinish) => {
              if (
                didFinish
              ) {
                goToReveal(
                  currentRoomId
                );
              } else {
                finishRequested.current =
                  false;
              }
            }
          )
          .catch((e) => {
            console.error(
              "Could not finish Mafia voting:",
              e
            );

            finishRequested.current =
              false;
          });
      }
    }

    tick();

    const timer =
      window.setInterval(
        tick,
        250
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    room,
    router,
  ]);

  const eligiblePlayers =
    useMemo(() => {
      if (!state) {
        return [];
      }

      return state.players.filter(
        (player) =>
          player.id !==
          state.my_player_id
      );
    }, [state]);

  async function handleVote(
    playerId: string
  ) {
    if (
      !roomId ||
      !state?.my_is_alive ||
      submitting
    ) {
      return;
    }

    setSubmitting(
      playerId
    );

    setError(null);

    try {
      playSound(
        "vote",
        0.75
      );

      await castMafiaVote(
        roomId,
        playerId
      );

      const fresh =
        await getMafiaVoteState(
          roomId
        );

      setState(
        fresh
      );

      if (
        fresh.status ===
        "reveal"
      ) {
        window.setTimeout(
          () => {
            goToReveal(
              roomId
            );
          },
          250
        );
      }
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Glas nije spremljen."
            : "Vote was not saved.")
      );
    } finally {
      setSubmitting(
        null
      );
    }
  }

  const progress =
    useMemo(() => {
      if (
        !room ||
        room.voting_time <= 0
      ) {
        return 0;
      }

      return Math.max(
        0,
        Math.min(
          100,
          (remaining /
            room.voting_time) *
            100
        )
      );
    }, [
      room,
      remaining,
    ]);

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
            🗳️
          </motion.div>

          <p className="mt-4 text-white/50">
            {language === "hr"
              ? "Učitavanje glasanja..."
              : "Loading voting..."}
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

  if (
    !state ||
    !room
  ) {
    return null;
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-5 p-6">
      <motion.div
        className="text-center pt-4"
        initial={{
          opacity: 0,
          y: -15,
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
          {state.day_number}
        </p>

        <h1 className="mt-2 text-3xl font-black">
          🗳️{" "}
          {language === "hr"
            ? "TKO JE MAFIJA?"
            : "WHO IS MAFIA?"}
        </h1>

        <motion.div
          key={remaining}
          initial={
            remaining <= 5 &&
            remaining > 0
              ? {
                  scale: 1.25,
                }
              : {
                  scale: 1,
                }
          }
          animate={{
            scale: 1,
          }}
          transition={{
            duration: 0.2,
          }}
          className={`mt-3 font-black tabular-nums ${
            remaining <= 10
              ? "text-4xl text-accent"
              : "text-3xl"
          }`}
        >
          {remaining}s
        </motion.div>

        <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{
              width:
                `${progress}%`,
            }}
            transition={{
              duration: 0.25,
            }}
          />
        </div>
      </motion.div>

      <motion.div
        className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center"
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.15,
        }}
      >
        <p className="text-sm text-white/45">
          {language === "hr"
            ? "Glasalo"
            : "Voted"}{" "}
          <span className="font-black text-white">
            {state.vote_count}
            /
            {state.alive_count}
          </span>
        </p>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{
              width:
                state.alive_count >
                0
                  ? `${
                      (state.vote_count /
                        state.alive_count) *
                      100
                    }%`
                  : "0%",
            }}
            transition={{
              duration: 0.35,
            }}
          />
        </div>
      </motion.div>

      {!state.my_is_alive ? (
        <motion.div
          className="mt-auto mb-auto rounded-3xl border border-white/10 bg-panel2 p-8 text-center"
          initial={{
            opacity: 0,
            scale: 0.9,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
        >
          <motion.div
            className="text-6xl"
            animate={{
              y: [
                0,
                -7,
                0,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            👻
          </motion.div>

          <h2 className="mt-4 text-2xl font-black">
            {language === "hr"
              ? "SAMO PROMATRAŠ"
              : "SPECTATING"}
          </h2>

          <p className="mt-3 text-white/45">
            {language === "hr"
              ? "Eliminirani igrači ne mogu glasati."
              : "Eliminated players cannot vote."}
          </p>
        </motion.div>
      ) : (
        <section className="flex flex-col gap-3">
          {eligiblePlayers.map(
            (
              player,
              index
            ) => {
              const selected =
                state.my_vote_player_id ===
                player.id;

              return (
                <motion.button
                  key={player.id}
                  type="button"
                  disabled={
                    submitting !==
                    null
                  }
                  onClick={() =>
                    handleVote(
                      player.id
                    )
                  }
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
                      0.2 +
                      index * 0.05,
                  }}
                  whileTap={{
                    scale: 0.97,
                  }}
                  className={`flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${
                    selected
                      ? "border-accent bg-accent/15 shadow-lg shadow-accent/10"
                      : "border-white/10 bg-panel2"
                  }`}
                >
                  <span className="text-3xl">
                    {player.avatar}
                  </span>

                  <span className="min-w-0 flex-1 truncate font-black">
                    {player.nickname}
                  </span>

                  <motion.span
                    animate={
                      selected
                        ? {
                            scale: [
                              1,
                              1.2,
                              1,
                            ],
                          }
                        : {}
                    }
                  >
                    {submitting ===
                    player.id
                      ? "..."
                      : selected
                      ? "✅"
                      : "›"}
                  </motion.span>
                </motion.button>
              );
            }
          )}
        </section>
      )}

      {state.my_is_alive &&
        state.my_vote_player_id && (
          <motion.div
            className="rounded-2xl border border-green-400/20 bg-green-400/10 p-4 text-center"
            initial={{
              opacity: 0,
              y: 10,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
          >
            <p className="font-black text-green-300">
              ✅{" "}
              {language === "hr"
                ? "GLAS SPREMLJEN"
                : "VOTE SAVED"}
            </p>

            <p className="mt-2 text-sm text-white/40">
              {language === "hr"
                ? "Možeš promijeniti glas dok glasanje traje."
                : "You can change your vote while voting is active."}
            </p>
          </motion.div>
        )}

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <motion.p
        className="mt-auto pb-4 text-center text-xs text-white/30"
        animate={
          remaining <= 5 &&
          remaining > 0
            ? {
                opacity: [
                  0.35,
                  1,
                  0.35,
                ],
              }
            : {
                opacity: 1,
              }
        }
        transition={{
          duration: 0.8,
          repeat:
            remaining <= 5 &&
            remaining > 0
              ? Infinity
              : 0,
        }}
      >
        {remaining <= 5 &&
        remaining > 0
          ? language === "hr"
            ? "⚠️ GLASANJE USKORO ZAVRŠAVA..."
            : "⚠️ VOTING ENDS SOON..."
          : language === "hr"
          ? "Ako je izjednačeno, nitko neće biti eliminiran."
          : "If the vote is tied, nobody will be eliminated."}
      </motion.p>
    </main>
  );
}