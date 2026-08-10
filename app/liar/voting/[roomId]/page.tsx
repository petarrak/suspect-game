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
  castLiarVote,
  finishLiarVotingIfDue,
  getLiarRoomById,
  getLiarVoteState,
  getMyLiarPlayerInRoom,
  type LiarPlayer,
  type LiarRoom,
  type LiarVoteState,
} from "@/lib/liar";

export default function LiarVotingPage() {
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

  const [
    voteState,
    setVoteState,
  ] =
    useState<LiarVoteState | null>(
      null
    );

  const [
    remaining,
    setRemaining,
  ] = useState(0);

  const [
    submitting,
    setSubmitting,
  ] = useState<string | null>(
    null
  );

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

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
        0.8
      );
    }

    router.replace(
      `/liar/reveal/${targetRoomId}`
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
          freshMe,
        ] =
          await Promise.all([
            getLiarRoomById(
              roomId
            ),
            getMyLiarPlayerInRoom(
              roomId
            ),
          ]);

        if (
          !freshRoom ||
          !freshMe
        ) {
          throw new Error(
            language === "hr"
              ? "Nije moguće učitati glasanje."
              : "Could not load voting."
          );
        }

        const {
          data,
          error:
            playersError,
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
            "joined_at",
            {
              ascending: true,
            }
          );

        if (playersError) {
          throw new Error(
            playersError.message
          );
        }

        if (cancelled) {
          return;
        }

        setRoom(freshRoom);
        setMe(freshMe);

        setPlayers(
          (data ?? []) as LiarPlayer[]
        );

        const state =
          await getLiarVoteState(
            roomId
          );

        if (!cancelled) {
          setVoteState(
            state
          );
        }

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
    router,
  ]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `liar-voting-room-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",
            schema:
              "public",
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
      !room ||
      room.status !==
        "voting"
    ) {
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const state =
          await getLiarVoteState(
            roomId
          );

        if (!cancelled) {
          setVoteState(
            state
          );
        }
      } catch {}
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
    room,
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

    revealSoundPlayed.current =
      false;

    const startedAt =
      room.voting_started_at;

    const votingTime =
      room.voting_time;

    const id = room.id;

    function updateTimer() {
      const end =
        new Date(
          startedAt
        ).getTime() +
        votingTime *
          1000;

      const seconds =
        Math.max(
          0,
          Math.ceil(
            (
              end -
              Date.now()
            ) /
              1000
          )
        );

      setRemaining(
        seconds
      );

      if (
        seconds > 0 &&
        seconds <= 5 &&
        lastTickSecond.current !==
          seconds
      ) {
        lastTickSecond.current =
          seconds;

        playSound(
          "tick",
          0.65
        );
      }

      if (
        seconds <= 0 &&
        !finishRequested.current
      ) {
        finishRequested.current =
          true;

        void finishLiarVotingIfDue(
          id
        )
          .then(
            (
              didFinish
            ) => {
              if (
                didFinish
              ) {
                goToReveal(
                  id
                );
              } else {
                finishRequested.current =
                  false;
              }
            }
          )
          .catch(
            (e) => {
              console.error(
                "Could not finish Liar voting:",
                e
              );

              finishRequested.current =
                false;
            }
          );
      }
    }

    updateTimer();

    const timer =
      window.setInterval(
        updateTimer,
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
    useMemo(
      () =>
        players.filter(
          (player) =>
            player.id !==
            me?.id
        ),
      [
        players,
        me,
      ]
    );

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

      await castLiarVote(
        roomId,
        playerId
      );

      const state =
        await getLiarVoteState(
          roomId
        );

      setVoteState(
        state
      );
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
        <p className="text-white/50">
          {language ===
          "hr"
            ? "Učitavanje glasanja..."
            : "Loading voting..."}
        </p>
      </main>
    );
  }

  if (
    error &&
    !room
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-accent">
          {error}
        </p>
      </main>
    );
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
        <p className="text-xs uppercase tracking-[0.25em] text-white/35">
          {language ===
          "hr"
            ? "RUNDA"
            : "ROUND"}{" "}
          {
            room?.current_round
          }
          {" / "}
          {
            room?.total_rounds
          }
        </p>

        <h1 className="mt-2 text-3xl font-black">
          🗳️{" "}
          {language ===
          "hr"
            ? "TKO JE LIAR?"
            : "WHO IS THE LIAR?"}
        </h1>

        <motion.div
          key={remaining}
          initial={
            remaining <= 5 &&
            remaining > 0
              ? {
                  scale: 1.18,
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
            remaining <=
            10
              ? "text-4xl text-accent"
              : "text-3xl"
          }`}
        >
          {remaining}s
        </motion.div>
      </motion.div>

      <motion.div
        className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center"
        initial={{
          opacity: 0,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
      >
        <p className="text-sm text-white/45">
          {language ===
          "hr"
            ? "Glasalo"
            : "Voted"}{" "}
          <span className="font-black text-white">
            {voteState
              ?.vote_count ??
              0}
            /
            {voteState
              ?.player_count ??
              players.length}
          </span>
        </p>
      </motion.div>

      <section className="flex flex-col gap-3">
        {eligiblePlayers.map(
          (
            player,
            index
          ) => {
            const selected =
              voteState
                ?.my_vote_player_id ===
              player.id;

            return (
              <motion.button
                key={
                  player.id
                }
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
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay:
                    index *
                    0.05,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                className={`flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${
                  selected
                    ? "border-accent bg-accent/15"
                    : "border-white/10 bg-panel2"
                }`}
              >
                <span className="text-3xl">
                  {player.avatar}
                </span>

                <span className="flex-1 font-black">
                  {
                    player.nickname
                  }
                </span>

                <span className="text-lg">
                  {submitting ===
                  player.id
                    ? "..."
                    : selected
                    ? "✅"
                    : "›"}
                </span>
              </motion.button>
            );
          }
        )}
      </section>

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <p className="mt-auto pb-4 text-center text-xs text-white/30">
        {remaining <= 5 &&
        remaining > 0
          ? language ===
            "hr"
            ? "⚠️ Glasanje završava..."
            : "⚠️ Voting is ending..."
          : language ===
            "hr"
          ? "Možeš promijeniti glas dok traje glasanje."
          : "You can change your vote while voting is open."}
      </p>
    </main>
  );
}