"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { motion } from "motion/react";

import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
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

  const [question, setQuestion] =
    useState<WhoWouldQuestion | null>(
      null
    );

  const [reveal, setReveal] =
    useState<WhoWouldRevealData | null>(
      null
    );

  const [room, setRoom] =
    useState<WhoWouldRoom | null>(
      null
    );

  const [me, setMe] =
    useState<WhoWouldPlayer | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [continuing, setContinuing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    async function load() {
      try {
        const [
          freshQuestion,
          freshReveal,
          freshRoom,
          freshMe,
        ] = await Promise.all([
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

        if (cancelled) return;

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
              "Could not load reveal."
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
    if (!roomId) return;

    const channel = supabase
      .channel(
        `who-would-reveal-room-${roomId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "who_would_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated =
            payload.new as WhoWouldRoom;

          setRoom(updated);

          if (
            updated.status === "question"
          ) {
            router.replace(
              `/who-would/question/${roomId}`
            );
          }

          if (
            updated.status === "ended"
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
      if (!reveal) return 0;

      return reveal.results.reduce(
        (sum, item) =>
          sum + item.votes,
        0
      );
    }, [reveal]);

  const maxVotes =
    useMemo(() => {
      if (!reveal) return 0;

      return Math.max(
        0,
        ...reveal.results.map(
          (item) => item.votes
        )
      );
    }, [reveal]);

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

      if (next === "ended") {
        router.replace(
          `/who-would/results/${roomId}`
        );
      } else {
        router.replace(
          `/who-would/question/${roomId}`
        );
      }
    } catch (e: any) {
      setError(
        e?.message ??
          "Could not continue."
      );

      setContinuing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-white/50">
          {language === "hr"
            ? "Otkrivanje rezultata..."
            : "Revealing results..."}
        </p>
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

  const finalRound =
    reveal.round_number >=
    reveal.total_rounds;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6 pb-8">
      <div className="text-center pt-5">
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

        <h1 className="mt-4 text-2xl font-black leading-snug">
          {text}
        </h1>
      </div>

      <section className="flex flex-col gap-3">
        {reveal.results.map(
          (player, index) => {
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
                key={player.player_id}
                className={`rounded-2xl border p-4 ${
                  winner
                    ? "border-accent bg-accent/15"
                    : "border-white/10 bg-panel2"
                }`}
                initial={{
                  opacity: 0,
                  y: 16,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay:
                    index * 0.06,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {player.avatar}
                  </span>

                  <span className="min-w-0 flex-1 truncate font-black">
                    {player.nickname}
                  </span>

                  <span className="font-black text-accent">
                    {player.votes}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${percent}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-right text-xs text-white/35">
                  {percent}%
                </p>
              </motion.div>
            );
          }
        )}
      </section>

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-auto">
        {me.is_host ? (
          <Button
            onClick={handleContinue}
            disabled={continuing}
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
      </div>
    </main>
  );
}