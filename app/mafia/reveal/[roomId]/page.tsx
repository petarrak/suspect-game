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

  const [reveal, setReveal] =
    useState<MafiaVoteReveal | null>(
      null
    );

  const [room, setRoom] =
    useState<MafiaRoom | null>(
      null
    );

  const [me, setMe] =
    useState<MafiaPlayer | null>(
      null
    );

  const [winner, setWinner] =
    useState<
      "MAFIA" | "CIVILIANS" | null
    >(null);

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
          freshReveal,
          freshRoom,
          freshMe,
        ] = await Promise.all([
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

        if (cancelled) return;

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

        setReveal(freshReveal);
        setRoom(freshRoom);
        setMe(freshMe);

        const result =
          await checkMafiaWinner(
            roomId
          );

        if (!cancelled) {
          setWinner(result);
        }

        if (result) {
          router.replace(
            `/mafia/results/${roomId}`
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
        `mafia-reveal-room-${roomId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mafia_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated =
            payload.new as MafiaRoom;

          setRoom(updated);

          if (
            updated.status === "night"
          ) {
            router.replace(
              `/mafia/night/${roomId}`
            );
          }

          if (
            updated.status === "ended"
          ) {
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

      if (next === "ended") {
        router.replace(
          `/mafia/results/${roomId}`
        );
      } else {
        router.replace(
          `/mafia/night/${roomId}`
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
            ? "Otkrivanje glasova..."
            : "Revealing votes..."}
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
    !reveal ||
    !room ||
    !me
  ) {
    return null;
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6 pb-8">
      <div className="text-center pt-5">
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
      </div>

      {reveal.tied ? (
        <motion.section
          className="rounded-3xl border border-yellow-400/25 bg-yellow-400/10 p-8 text-center"
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
            ⚖️
          </div>

          <h2 className="mt-4 text-2xl font-black text-yellow-300">
            {language === "hr"
              ? "IZJEDNAČENO"
              : "IT'S A TIE"}
          </h2>

          <p className="mt-3 text-white/50">
            {language === "hr"
              ? "Nitko nije eliminiran."
              : "Nobody was eliminated."}
          </p>
        </motion.section>
      ) : (
        <motion.section
          className="rounded-3xl border border-red-400/25 bg-red-400/10 p-8 text-center"
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
            {reveal.eliminated_avatar}
          </div>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-white/35">
            {language === "hr"
              ? "ELIMINIRAN JE"
              : "ELIMINATED"}
          </p>

          <h2 className="mt-2 text-3xl font-black">
            {reveal.eliminated_nickname}
          </h2>

          <p className="mt-3 font-black text-red-300">
            💀{" "}
            {language === "hr"
              ? "IZBAČEN IZ IGRE"
              : "OUT OF THE GAME"}
          </p>
        </motion.section>
      )}

      <section className="card p-5">
        <h3 className="font-black">
          🗳️{" "}
          {language === "hr"
            ? "GLASOVI"
            : "VOTES"}
        </h3>

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
      </div>
    </main>
  );
}