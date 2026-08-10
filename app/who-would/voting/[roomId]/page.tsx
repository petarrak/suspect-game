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

import { useLanguage } from "@/components/LanguageProvider";

import { playSound } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";

import {
  castWhoWouldVote,
  getWhoWouldQuestion,
  getWhoWouldRoomById,
  getWhoWouldVoteState,
  type WhoWouldQuestion,
  type WhoWouldRoom,
  type WhoWouldVoteState,
} from "@/lib/whoWould";

export default function WhoWouldVotingPage() {
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
    room,
    setRoom,
  ] =
    useState<WhoWouldRoom | null>(
      null
    );

  const [
    question,
    setQuestion,
  ] =
    useState<WhoWouldQuestion | null>(
      null
    );

  const [
    state,
    setState,
  ] =
    useState<WhoWouldVoteState | null>(
      null
    );

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
        0.8
      );
    }

    router.replace(
      `/who-would/reveal/${targetRoomId}`
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
          freshQuestion,
          freshState,
        ] =
          await Promise.all([
            getWhoWouldRoomById(
              roomId
            ),

            getWhoWouldQuestion(
              roomId
            ),

            getWhoWouldVoteState(
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

        setQuestion(
          freshQuestion
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
          `who-would-voting-${roomId}`
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

  async function handleVote(
    playerId: string
  ) {
    if (
      !roomId ||
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
        0.7
      );

      await castWhoWouldVote(
        roomId,
        playerId
      );

      const fresh =
        await getWhoWouldVoteState(
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
    !question ||
    !room
  ) {
    return null;
  }

  const text =
    language === "hr"
      ? question.question_hr
      : question.question_en;

  const voteProgress =
    state.player_count > 0
      ? Math.min(
          100,
          (state.vote_count /
            state.player_count) *
            100
        )
      : 0;

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
          😂 WHO WOULD?
        </p>

        <motion.h1
          className="mt-3 text-xl font-black leading-snug"
          initial={{
            opacity: 0,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 0.15,
          }}
        >
          {text}
        </motion.h1>
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
          delay: 0.2,
        }}
      >
        <p className="text-sm text-white/45">
          {language === "hr"
            ? "Glasalo"
            : "Voted"}{" "}
          <span className="font-black text-white">
            {state.vote_count}
            /
            {state.player_count}
          </span>
        </p>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{
              width:
                `${voteProgress}%`,
            }}
            transition={{
              duration: 0.35,
            }}
          />
        </div>
      </motion.div>

      <section className="flex flex-col gap-3">
        {state.players.map(
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
                    0.25 +
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
                <motion.span
                  className="text-3xl"
                  animate={
                    selected
                      ? {
                          scale: [
                            1,
                            1.15,
                            1,
                          ],
                        }
                      : {}
                  }
                >
                  {player.avatar}
                </motion.span>

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

      {state.my_vote_player_id && (
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
              ? "Možeš promijeniti glas dok ostali glasaju."
              : "You can change your vote while the others are voting."}
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
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 0.4,
        }}
      >
        {language === "hr"
          ? "Možeš glasati i za sebe. Rezultat se otkriva kad svi glasaju."
          : "You can vote for yourself. Results reveal when everyone has voted."}
      </motion.p>
    </main>
  );
}