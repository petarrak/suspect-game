"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase, ensureAnonSession } from "@/lib/supabase";
import { startGame } from "@/lib/useRoom";
import { playSound } from "@/lib/sounds";
import type { Player, Room, Vote } from "@/lib/types";

type RoundInfo = {
  id: string;
  question_id: number;
  round_number: number;
};

type QuestionInfo = {
  id: number;
  normal_question: string;
  suspect_question: string;
  normal_question_hr: string | null;
  suspect_question_hr: string | null;
  category: string;
};


function AnimatedScore({
  value,
  delay = 0,
}: {
  value: number;
  delay?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const startTimer = window.setTimeout(() => {
      const duration = 700;
      const startedAt = performance.now();

      function animate(now: number) {
        const progress = Math.min(
          1,
          (now - startedAt) / duration
        );

        const eased =
          1 - Math.pow(1 - progress, 3);

        setDisplay(
          Math.round(value * eased)
        );

        if (progress < 1) {
          requestAnimationFrame(
            animate
          );
        }
      }

      requestAnimationFrame(
        animate
      );
    }, delay);

    return () => {
      window.clearTimeout(
        startTimer
      );
    };
  }, [value, delay]);

  return <>{display}</>;
}

export default function RevealPage() {
  const params = useParams();
  const router = useRouter();
  const { language, t } = useLanguage();

  const rawRoomId = params.roomId;

  const roomId = Array.isArray(rawRoomId)
    ? rawRoomId[0]
    : rawRoomId;

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [round, setRound] = useState<RoundInfo | null>(null);
  const [question, setQuestion] = useState<QuestionInfo | null>(null);

  const [meId, setMeId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [nextRoundLoading, setNextRoundLoading] =
    useState(false);

  const [nextRoundError, setNextRoundError] =
    useState<string | null>(null);

  const revealSoundPlayed = useRef(false);
  const winnerSoundPlayed = useRef(false);

  async function refetchPlayers(targetRoomId: string) {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", targetRoomId)
      .order("score", { ascending: false })
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Could not refresh players:", error);
      return;
    }

    setPlayers((data ?? []) as Player[]);
  }

  useEffect(() => {
    if (!roomId) {
      setLoadError(language === "hr" ? "Nedostaje ID sobe." : "Missing room ID.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadReveal() {
      setLoading(true);
      setLoadError(null);

      try {
        const userId =
          await ensureAnonSession();

        const {
          data: roomData,
          error: roomError,
        } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .single();

        if (roomError) {
          throw new Error(roomError.message);
        }

        if (!roomData.current_round_id) {
          throw new Error(
            (language === "hr" ? "Ova soba nema aktivnu rundu." : "This room has no current round.")
          );
        }

        const {
          data: playersData,
          error: playersError,
        } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomId)
          .order("joined_at", {
            ascending: true,
          });

        if (playersError) {
          throw new Error(
            playersError.message
          );
        }

        const currentPlayers =
          (playersData ?? []) as Player[];

        const myPlayer =
          currentPlayers.find(
            (player) =>
              player.user_id === userId
          ) ?? null;

        if (myPlayer) {
          setMeId(myPlayer.id);

          if (myPlayer.is_ready) {
            await supabase
              .from("players")
              .update({
                is_ready: false,
              })
              .eq("id", myPlayer.id);
          }
        }

        const {
          data: roundData,
          error: roundError,
        } = await supabase
          .from("rounds")
          .select(
            "id, question_id, round_number"
          )
          .eq(
            "id",
            roomData.current_round_id
          )
          .single();

        if (roundError) {
          throw new Error(
            roundError.message
          );
        }

        const {
          data: questionData,
          error: questionError,
        } = await supabase
          .from("questions")
          .select(
            "id, normal_question, suspect_question, normal_question_hr, suspect_question_hr, category"
          )
          .eq(
            "id",
            roundData.question_id
          )
          .single();

        if (questionError) {
          throw new Error(
            questionError.message
          );
        }

        const {
          data: votesData,
          error: votesError,
        } = await supabase
          .from("votes")
          .select("*")
          .eq(
            "round_id",
            roomData.current_round_id
          );

        if (votesError) {
          throw new Error(
            votesError.message
          );
        }

        /*
         * Only host applies scoring.
         * The SQL function is idempotent, so refreshing
         * cannot award points twice.
         */
        if (myPlayer?.is_host) {
          const { error: scoreError } =
            await supabase.rpc(
              "apply_round_scoring",
              {
                p_room_id: roomData.id,
              }
            );

          if (scoreError) {
            throw new Error(
              `Scoring: ${scoreError.message}`
            );
          }
        }

        const {
          data: scoredPlayers,
          error: scoredPlayersError,
        } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomId)
          .order("score", {
            ascending: false,
          })
          .order("joined_at", {
            ascending: true,
          });

        if (scoredPlayersError) {
          throw new Error(
            scoredPlayersError.message
          );
        }

        if (cancelled) return;

        setRoom(roomData as Room);

        setPlayers(
          (scoredPlayers ??
            currentPlayers) as Player[]
        );

        setRound(
          roundData as RoundInfo
        );

        setQuestion(
          questionData as QuestionInfo
        );

        setVotes(
          (votesData ?? []) as Vote[]
        );
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(
            e?.message ??
              (language === "hr" ? "Nije moguće učitati podatke otkrivanja." : "Could not load reveal information.")
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReveal();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  /*
   * Realtime:
   * - score changes update leaderboard
   * - next round redirects everyone
   */
  useEffect(() => {
    if (!roomId) return;

    const roomChannel = supabase
      .channel(
        `reveal-room-${roomId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated =
            payload.new as Room;

          setRoom(updated);

          if (
            updated.status ===
            "question"
          ) {
            router.push(
              `/question/${roomId}`
            );
          }
        }
      )
      .subscribe();

    const playersChannel = supabase
      .channel(
        `reveal-players-${roomId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          refetchPlayers(roomId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        roomChannel
      );

      supabase.removeChannel(
        playersChannel
      );
    };
  }, [roomId, router]);

  const me =
    players.find(
      (player) =>
        player.id === meId
    ) ?? null;

  const suspect =
    useMemo(() => {
      if (
        !room?.suspect_player_id
      ) {
        return null;
      }

      return (
        players.find(
          (player) =>
            player.id ===
            room.suspect_player_id
        ) ?? null
      );
    }, [players, room]);

  const voteRows =
    useMemo(() => {
      if (!room) return [];

      return votes.map(
        (vote) => {
          const voter =
            players.find(
              (player) =>
                player.id ===
                vote.voter_player_id
            ) ?? null;

          const votedFor =
            players.find(
              (player) =>
                player.id ===
                vote.voted_for_player_id
            ) ?? null;

          const correct =
            vote.voted_for_player_id ===
            room.suspect_player_id;

          return {
            vote,
            voter,
            votedFor,
            correct,
          };
        }
      );
    }, [votes, players, room]);

  const correctVotes =
    voteRows.filter(
      (row) => row.correct
    ).length;

  const caught =
    players.length > 0 &&
    correctVotes >
      players.length / 2;

  const leaderboard =
    [...players].sort(
      (a, b) =>
        b.score - a.score
    );

  const isLastRound =
    room != null &&
    room.current_round >=
      room.total_rounds;

  const confettiPieces = [
    "🎉",
    "✨",
    "⭐",
    "🎊",
    "💫",
    "🏆",
    "✨",
    "🎉",
    "⭐",
    "🎊",
  ];

  useEffect(() => {
    if (
      loading ||
      loadError ||
      !room ||
      revealSoundPlayed.current
    ) {
      return;
    }

    revealSoundPlayed.current = true;
    playSound("reveal");
  }, [loading, loadError, room]);

  useEffect(() => {
    if (
      loading ||
      loadError ||
      !room ||
      !isLastRound ||
      winnerSoundPlayed.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      winnerSoundPlayed.current = true;
      playSound("winner");
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loading, loadError, room, isLastRound]);

  async function handleNextRound() {
    if (
      !room ||
      !me?.is_host ||
      nextRoundLoading
    ) {
      return;
    }

    setNextRoundLoading(true);
    setNextRoundError(null);

    try {
      const {
        data: freshPlayers,
        error: playersError,
      } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("joined_at", {
          ascending: true,
        });

      if (playersError) {
        throw new Error(
          playersError.message
        );
      }

      await startGame(
        room,
        (freshPlayers ??
          []) as Player[]
      );

      router.push(
        `/question/${room.id}`
      );
    } catch (e: any) {
      console.error(
        "Next round failed:",
        e
      );

      setNextRoundError(
        e?.message ??
          (language === "hr" ? "Nije moguće pokrenuti sljedeću rundu." : "Could not start next round.")
      );

      setNextRoundLoading(false);
    }
  }

  async function handlePlayAgain() {
    if (
      !room ||
      !me?.is_host ||
      nextRoundLoading
    ) {
      return;
    }

    setNextRoundLoading(true);
    setNextRoundError(null);

    try {
      const { error: resetError } =
        await supabase.rpc(
          "reset_game_for_rematch",
          {
            p_room_id: room.id,
          }
        );

      if (resetError) {
        throw new Error(
          resetError.message
        );
      }

      const {
        data: freshRoom,
        error: roomError,
      } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", room.id)
        .single();

      if (roomError) {
        throw new Error(
          roomError.message
        );
      }

      const {
        data: freshPlayers,
        error: playersError,
      } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("joined_at", {
          ascending: true,
        });

      if (playersError) {
        throw new Error(
          playersError.message
        );
      }

      await startGame(
        freshRoom as Room,
        (freshPlayers ?? []) as Player[]
      );

      router.push(
        `/question/${room.id}`
      );
    } catch (e: any) {
      console.error(
        "Play again failed:",
        e
      );

      setNextRoundError(
        e?.message ??
          (language === "hr" ? "Nije moguće pokrenuti novu igru." : "Could not start a new game.")
      );

      setNextRoundLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/50">
          {language === "hr" ? "Učitavanje otkrivanja..." : "Loading reveal..."}
        </p>
      </main>
    );
  }

  if (loadError || !room) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-2xl font-black">
          {language === "hr" ? "GREŠKA PRI OTKRIVANJU" : "REVEAL ERROR"}
        </h1>

        <p className="text-accent text-center">
          {loadError ??
            (language === "hr" ? "Sobu nije moguće učitati." : "Room could not be loaded.")}
        </p>

        <Button
          variant="secondary"
          onClick={() =>
            router.push("/")
          }
        >
          {t("backHome")}
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">

      <motion.div
        className="text-center pt-4"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-white/40 mb-2">
          {t("round")}{" "}
          {round?.round_number ??
            room.current_round}
          {" / "}
          {room.total_rounds}
        </p>

        <h1 className="text-4xl font-black">
          {t("reveal")}
        </h1>
      </motion.div>

      <motion.section
        className="rounded-3xl border border-accent/40 bg-accent/10 p-7 text-center"
        initial={{ opacity: 0, scale: 0.92, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.2 }}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-4">
          {t("suspectWas")}
        </p>

        <motion.div
          className="text-5xl mb-3"
          initial={{ opacity: 0, scale: 0.3, rotate: -18 }}
          animate={{ opacity: 1, scale: [0.3, 1.25, 1], rotate: [ -18, 8, 0 ] }}
          transition={{ duration: 0.65, delay: 0.45 }}
        >
          🕵️
        </motion.div>

        <motion.div
          className="flex items-center justify-center gap-3"
          initial={{ opacity: 0, scale: 0.35 }}
          animate={{ opacity: 1, scale: [0.35, 1.18, 0.96, 1] }}
          transition={{ duration: 0.65, delay: 0.9, ease: "easeOut" }}
        >
          <motion.span
            className="text-4xl"
            initial={{ rotate: -25 }}
            animate={{ rotate: [ -25, 12, -5, 0 ] }}
            transition={{ duration: 0.7, delay: 0.95 }}
          >
            {suspect?.avatar || "🙂"}
          </motion.span>

          <h2 className="text-3xl font-black">
            {suspect?.nickname ??
              (language === "hr" ? "Nepoznato" : "Unknown")}
          </h2>
        </motion.div>
      </motion.section>

      {question && (
        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 1.25 }}
        >
          <motion.section
            className="rounded-2xl bg-panel2 border border-white/10 p-5"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 1.35 }}
          >
            <p className="text-xs uppercase tracking-widest text-green-400 mb-3">
              {t("normalQuestion")}
            </p>

            <p className="text-lg font-semibold">
              {
                language === "hr"
                  ? question.normal_question_hr || question.normal_question
                  : question.normal_question
              }
            </p>
          </motion.section>

          <motion.section
            className="rounded-2xl bg-panel2 border border-accent/30 p-5"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 1.5 }}
          >
            <p className="text-xs uppercase tracking-widest text-accent mb-3">
              {t("suspectQuestion")}
            </p>

            <p className="text-lg font-semibold">
              {
                language === "hr"
                  ? question.suspect_question_hr || question.suspect_question
                  : question.suspect_question
              }
            </p>
          </motion.section>
        </motion.div>
      )}

      <motion.section
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.65 }}
      >
        <div className="flex justify-between">
          <h3 className="text-lg font-bold">
            {t("votes")}
          </h3>

          <span className="text-sm text-white/40">
            {correctVotes}/
            {players.length} {t("correct")}
          </span>
        </div>

        {voteRows.map((row) => (
          <div
            key={row.vote.id}
            className="rounded-2xl bg-panel2 border border-white/10 p-4 flex gap-3"
          >
            <div className="text-2xl">
              {row.correct
                ? "✅"
                : "❌"}
            </div>

            <div>
              <p className="font-semibold flex items-center gap-2">
                <span>
                  {row.voter?.avatar || "🙂"}
                </span>

                <span>
                  {row.voter?.nickname ??
                    (language === "hr" ? "Nepoznato" : "Unknown")}
                </span>
              </p>

              <p className="text-sm text-white/40">
                {language === "hr" ? "glasao za" : "voted for"}{" "}
                <span className="text-white/80">
                  {row.votedFor?.avatar || "🙂"}{" "}
                  {row.votedFor?.nickname ??
                    (language === "hr" ? "Nepoznato" : "Unknown")}
                </span>
              </p>
            </div>
          </div>
        ))}
      </motion.section>

      <motion.section
        className="rounded-2xl bg-panel2 border border-white/10 p-6 text-center"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: [0.88, 1.05, 1] }}
        transition={{ duration: 0.55, delay: 1.9, ease: "easeOut" }}
      >
        {caught ? (
          <>
            <motion.div
              className="text-4xl mb-3"
              animate={{ scale: [1, 1.35, 1], rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.75, delay: 2.15 }}
            >
              🎯
            </motion.div>

            <h3 className="text-xl font-black">
              {t("suspectCaught")}
            </h3>
          </>
        ) : (
          <>
            <motion.div
              className="text-4xl mb-3"
              animate={{ scale: [1, 1.35, 1], rotate: [0, 8, -8, 0] }}
              transition={{ duration: 0.75, delay: 2.15 }}
            >
              😈
            </motion.div>

            <h3 className="text-xl font-black">
              {t("suspectEscaped")}
            </h3>
          </>
        )}
      </motion.section>

      {/* LEADERBOARD 2.0 */}

      <motion.section
        className="relative overflow-hidden rounded-3xl bg-panel2 border border-white/10 p-5"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 2.1 }}
      >
        {isLastRound && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {confettiPieces.map((piece, index) => (
              <motion.span
                key={`${piece}-${index}`}
                className="absolute text-xl"
                initial={{
                  opacity: 0,
                  y: -30,
                  x: 0,
                  rotate: 0,
                }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: 380,
                  x:
                    index % 2 === 0
                      ? 42
                      : -42,
                  rotate:
                    index % 2 === 0
                      ? 240
                      : -240,
                }}
                transition={{
                  duration: 2.8 + (index % 3) * 0.35,
                  delay: 2.25 + index * 0.09,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                }}
                style={{
                  left: `${8 + index * 9}%`,
                  top: "-8%",
                }}
              >
                {piece}
              </motion.span>
            ))}
          </div>
        )}

        <div className="relative z-10 text-center mb-5">
          <p className="text-xs uppercase tracking-[0.25em] text-white/40 mb-1">
            {isLastRound
              ? t("finalResults")
              : t("currentStandings")}
          </p>

          <motion.h2
            className="text-2xl font-black"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.35,
              delay: 2.25,
            }}
          >
            🏆 {t("leaderboard")}
          </motion.h2>
        </div>

        {leaderboard[0] && (
          <motion.div
            className="relative z-10 mb-4 rounded-3xl border border-yellow-300/40 bg-yellow-400/10 px-5 py-6 text-center shadow-[0_0_35px_rgba(250,204,21,0.14)]"
            initial={{
              opacity: 0,
              scale: 0.82,
              y: 18,
            }}
            animate={{
              opacity: 1,
              scale: [0.82, 1.04, 1],
              y: 0,
            }}
            transition={{
              duration: 0.55,
              delay: 2.35,
              ease: "easeOut",
            }}
          >
            <motion.div
              className="text-4xl mb-1"
              animate={{
                y: [0, -5, 0],
                rotate: [0, -5, 5, 0],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                repeatDelay: 1.1,
              }}
            >
              👑
            </motion.div>

            <div className="text-5xl mb-2">
              {leaderboard[0].avatar || "🙂"}
            </div>

            <p className="text-xl font-black">
              {leaderboard[0].nickname}
              {leaderboard[0].id === meId && (
                <span className="ml-2 text-sm font-semibold text-white/40">
                  {language === "hr"
                    ? "(ti)"
                    : "(you)"}
                </span>
              )}
            </p>

            <div className="mt-2 text-3xl font-black text-yellow-300">
              <AnimatedScore
                value={leaderboard[0].score}
                delay={2500}
              />
              <span className="ml-1 text-sm text-yellow-200/70">
                pts
              </span>
            </div>
          </motion.div>
        )}

        <div className="relative z-10 flex flex-col gap-3">
          {leaderboard.map(
            (player, index) => {
              if (index === 0) {
                return null;
              }

              const position =
                index + 1;

              const medal =
                index === 1
                  ? "🥈"
                  : index === 2
                  ? "🥉"
                  : `${position}.`;

              const glowClass =
                index === 1
                  ? "border-slate-300/30 bg-slate-300/5 shadow-[0_0_24px_rgba(203,213,225,0.08)]"
                  : index === 2
                  ? "border-orange-400/25 bg-orange-500/5 shadow-[0_0_24px_rgba(251,146,60,0.06)]"
                  : "border-white/10 bg-black/20";

              return (
                <motion.div
                  key={player.id}
                  layout
                  className={`flex items-center gap-4 rounded-2xl border px-4 py-4 ${glowClass}`}
                  initial={{
                    opacity: 0,
                    x: 28,
                    scale: 0.96,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.35,
                    delay:
                      2.55 +
                      index * 0.12,
                  }}
                >
                  <div className="w-9 text-center text-xl font-black">
                    {medal}
                  </div>

                  <div className="text-2xl">
                    {player.avatar || "🙂"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">
                      {player.nickname}

                      {player.id === meId && (
                        <span className="text-white/40">
                          {" "}
                          {language === "hr"
                            ? "(ti)"
                            : "(you)"}
                        </span>
                      )}
                    </p>
                  </div>

                  <motion.div
                    className="text-xl font-black text-accent"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [0.8, 1.12, 1] }}
                    transition={{
                      duration: 0.35,
                      delay:
                        2.8 +
                        index * 0.12,
                    }}
                  >
                    <AnimatedScore
                      value={player.score}
                      delay={
                        2750 +
                        index * 120
                      }
                    />
                  </motion.div>
                </motion.div>
              );
            }
          )}
        </div>

      </motion.section>

      {nextRoundError && (
        <p className="text-center text-accent text-sm">
          {nextRoundError}
        </p>
      )}

      <div className="flex flex-col gap-3 pb-4">

        {!isLastRound &&
          me?.is_host && (
            <Button
              onClick={
                handleNextRound
              }
              disabled={
                nextRoundLoading
              }
            >
              {nextRoundLoading
                ? language === "hr"
                  ? "POKRETANJE RUNDE..."
                  : "STARTING ROUND..."
                : t("nextRound")}
            </Button>
          )}

        {!isLastRound &&
          !me?.is_host && (
            <p className="text-center text-white/40">
              {t("waitingHostNext")}
            </p>
          )}

        {isLastRound && (
          <>
            <p className="text-center text-xl font-black">
              🏁 {t("gameFinished")}
            </p>

            <p className="text-center text-white/40">
              {t("winner")}:{" "}
              <span className="text-white font-bold">
                {leaderboard[0]
                  ?.nickname ??
                  "Nobody"}
              </span>
              {" "}
              🏆
            </p>

            {me?.is_host ? (
              <Button
                onClick={handlePlayAgain}
                disabled={nextRoundLoading}
              >
                {nextRoundLoading
                  ? language === "hr"
                    ? "POKRETANJE NOVE IGRE..."
                    : "STARTING NEW GAME..."
                  : `🔄 ${t("playAgain")}`}
              </Button>
            ) : (
              <p className="text-center text-white/40">
                {language === "hr"
                  ? "Čekamo hosta da pokrene novu igru..."
                  : "Waiting for host to start a rematch..."}
              </p>
            )}

            <Button
              variant="secondary"
              onClick={() =>
                router.push("/")
              }
            >
              {t("backHome")}
            </Button>
          </>
        )}

      </div>

    </main>
  );
}