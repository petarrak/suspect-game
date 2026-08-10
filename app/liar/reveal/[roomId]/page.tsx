"use client";

import {
  useEffect,
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
  getLiarReveal,
  getLiarRoomById,
  getMyLiarPlayerInRoom,
  nextLiarRound,
  type LiarPlayer,
  type LiarRevealData,
  type LiarRoom,
} from "@/lib/liar";

export default function LiarRevealPage() {
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

  const [reveal, setReveal] =
    useState<LiarRevealData | null>(
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
          freshRoom,
          freshMe,
          freshReveal,
        ] = await Promise.all([
          getLiarRoomById(roomId),
          getMyLiarPlayerInRoom(
            roomId
          ),
          getLiarReveal(roomId),
        ]);

        if (cancelled) return;

        if (!freshRoom || !freshMe) {
          throw new Error(
            language === "hr"
              ? "Nije moguće učitati rezultat."
              : "Could not load result."
          );
        }

        setRoom(freshRoom);
        setMe(freshMe);
        setReveal(freshReveal);
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
  ]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(
        `liar-reveal-room-${roomId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "liar_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated =
            payload.new as LiarRoom;

          setRoom(updated);

          if (
            updated.status === "word"
          ) {
            router.replace(
              `/liar/word/${roomId}`
            );
          }

          if (
            updated.status === "ended"
          ) {
            router.replace(
              `/liar/results/${roomId}`
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
        await nextLiarRound(
          roomId
        );

      if (next === "word") {
        router.replace(
          `/liar/word/${roomId}`
        );
      } else {
        router.replace(
          `/liar/results/${roomId}`
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

  if (!reveal || !room || !me) {
    return null;
  }

  const secretWord =
    language === "hr"
      ? reveal.word_hr
      : reveal.word_en;

  const finalRound =
    room.current_round >=
    room.total_rounds;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-5 p-6 pb-8">
      <div className="text-center pt-4">
        <p className="text-xs uppercase tracking-[0.25em] text-white/35">
          {language === "hr"
            ? "RUNDA"
            : "ROUND"}{" "}
          {reveal.round_number}
          {" / "}
          {room.total_rounds}
        </p>

        <h1 className="mt-2 text-3xl font-black">
          🤥{" "}
          {language === "hr"
            ? "OTKRIVANJE"
            : "REVEAL"}
        </h1>
      </div>

      <motion.section
        className={`rounded-3xl border p-7 text-center ${
          reveal.liar_caught
            ? "border-green-400/30 bg-green-400/10"
            : "border-accent/35 bg-accent/10"
        }`}
        initial={{
          opacity: 0,
          scale: 0.92,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
      >
        <div className="text-6xl">
          {reveal.liar_avatar}
        </div>

        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-white/35">
          {language === "hr"
            ? "LIAR JE BIO"
            : "THE LIAR WAS"}
        </p>

        <h2 className="mt-2 text-3xl font-black">
          {reveal.liar_nickname}
        </h2>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-widest text-white/35">
            {language === "hr"
              ? "TAJNA RIJEČ"
              : "SECRET WORD"}
          </p>

          <p className="mt-2 text-2xl font-black">
            {secretWord}
          </p>
        </div>

        <p
          className={`mt-5 text-xl font-black ${
            reveal.liar_caught
              ? "text-green-300"
              : "text-accent"
          }`}
        >
          {reveal.liar_caught
            ? language === "hr"
              ? "✅ LIAR JE UHVAĆEN!"
              : "✅ LIAR WAS CAUGHT!"
            : language === "hr"
            ? "😈 LIAR JE POBJEGAO!"
            : "😈 LIAR ESCAPED!"}
        </p>
      </motion.section>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-black">
            🗳️{" "}
            {language === "hr"
              ? "GLASOVI"
              : "VOTES"}
          </h3>

          <span className="text-xs text-white/35">
            {reveal.correct_vote_count}{" "}
            {language === "hr"
              ? "točno"
              : "correct"}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {reveal.votes.length === 0 ? (
            <p className="text-sm text-white/35">
              {language === "hr"
                ? "Nitko nije glasao."
                : "Nobody voted."}
            </p>
          ) : (
            reveal.votes.map(
              (vote) => (
                <div
                  key={
                    vote.voter_player_id
                  }
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  <span>
                    {vote.correct
                      ? "✅"
                      : "❌"}
                  </span>

                  <span className="text-xl">
                    {vote.voter_avatar}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {
                        vote.voter_nickname
                      }
                    </p>

                    <p className="truncate text-xs text-white/35">
                      →{" "}
                      {
                        vote.target_avatar
                      }{" "}
                      {
                        vote.target_nickname
                      }
                    </p>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </section>

      <section className="card p-5">
        <h3 className="font-black">
          🏆{" "}
          {language === "hr"
            ? "BODOVI"
            : "SCORES"}
        </h3>

        <div className="mt-4 flex flex-col gap-2">
          {reveal.scores.map(
            (player, index) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
              >
                <span className="w-6 text-center font-black text-white/35">
                  {index + 1}.
                </span>

                <span className="text-2xl">
                  {player.avatar}
                </span>

                <span className="min-w-0 flex-1 truncate font-bold">
                  {player.nickname}
                </span>

                <span className="font-black text-accent">
                  {player.score}
                </span>
              </div>
            )
          )}
        </div>
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