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
import { playSound } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";

import {
  getDrawGuessFinalResults,
  getMyDrawGuessPlayerInRoom,
  restartDrawGuessGame,
  type DrawGuessFinalResult,
} from "@/lib/drawGuess";

export default function DrawGuessResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();

  const rawRoomId = params.roomId;
  const roomId = Array.isArray(rawRoomId)
    ? rawRoomId[0]
    : rawRoomId;

  const [players, setPlayers] =
    useState<DrawGuessFinalResult[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [result, me] = await Promise.all([
          getDrawGuessFinalResults(roomId),
          getMyDrawGuessPlayerInRoom(roomId),
        ]);

        if (cancelled) return;

        const ranked = [...result]
          .sort((a, b) => b.score - a.score)
          .map((player, index) => ({
            ...player,
            position: index + 1,
          }));

        setPlayers(ranked);
        setIsHost(Boolean(me?.is_host));

        if (ranked.length > 0) {
          playSound("winner", 0.85);
        }
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
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [roomId, language]);

  useEffect(() => {
    if (!roomId) return;

    let checking = false;

    async function checkRoom() {
      if (checking) return;
      checking = true;

      try {
        const { data } = await supabase
          .from("draw_guess_rooms")
          .select("status")
          .eq("id", roomId)
          .maybeSingle();

        if (data?.status === "choosing") {
          router.replace(`/draw-guess/choose/${roomId}`);
        }
      } finally {
        checking = false;
      }
    }

    const channel = supabase
      .channel(`draw-guess-results-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "draw_guess_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated = payload.new as { status?: string };

          if (updated.status === "choosing") {
            router.replace(`/draw-guess/choose/${roomId}`);
          }
        }
      )
      .subscribe();

    void checkRoom();
    const interval = window.setInterval(checkRoom, 1000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [roomId, router]);

  async function handleRestart() {
    if (!roomId || !isHost || restarting) return;

    setRestarting(true);
    setError(null);

    try {
      playSound("click", 0.5);
      await restartDrawGuessGame(roomId);
      router.replace(`/draw-guess/choose/${roomId}`);
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće ponovno pokrenuti igru."
            : "Could not restart game.")
      );
      setRestarting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="text-7xl"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.3, repeat: Infinity }}
          >
            🏆
          </motion.div>

          <p className="mt-4 text-white/45">
            {language === "hr"
              ? "Učitavanje rezultata..."
              : "Loading results..."}
          </p>
        </motion.div>
      </main>
    );
  }

  const winner = players[0] ?? null;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <motion.header
        className="text-center pt-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          🎨 DRAW & GUESS
        </p>
        <h1 className="mt-2 text-4xl font-black">
          {language === "hr" ? "KRAJ IGRE" : "GAME OVER"}
        </h1>
      </motion.header>

      {winner && (
        <motion.section
          className="rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-6 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
        >
          <motion.div
            className="text-7xl"
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring" }}
          >
            🏆
          </motion.div>
          <p className="mt-3 text-xs font-black uppercase tracking-widest text-yellow-300">
            {language === "hr" ? "POBJEDNIK" : "WINNER"}
          </p>
          <div className="mt-3 text-6xl">{winner.avatar}</div>
          <h2 className="mt-3 text-3xl font-black">{winner.nickname}</h2>
          <p className="mt-2 text-2xl font-black text-yellow-300">
            {winner.score} PTS
          </p>
        </motion.section>
      )}

      <section className="flex flex-col gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-white/35">
          {language === "hr" ? "KONAČNI POREDAK" : "FINAL STANDINGS"}
        </p>

        {players.map((player, index) => {
          const position = index + 1;
          const medal =
            position === 1
              ? "🥇"
              : position === 2
              ? "🥈"
              : position === 3
              ? "🥉"
              : `#${position}`;

          return (
            <motion.div
              key={player.player_id ?? `${player.nickname}-${index}`}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-4 ${
                position === 1
                  ? "border-yellow-400/30 bg-yellow-400/10"
                  : "border-white/10 bg-panel2"
              }`}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + index * 0.07 }}
            >
              <div className="w-10 text-center text-xl font-black">{medal}</div>
              <div className="text-3xl">{player.avatar}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{player.nickname}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-accent">{player.score}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/25">
                  PTS
                </p>
              </div>
            </motion.div>
          );
        })}
      </section>

      {error && (
        <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4">
          <p className="text-center text-sm text-accent">{error}</p>
        </div>
      )}

      <motion.div
        className="mt-auto flex flex-col gap-3"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        {isHost ? (
          <Button
            disabled={restarting}
            onClick={() => void handleRestart()}
          >
            🎨{" "}
            {restarting
              ? language === "hr"
                ? "POKRETANJE..."
                : "STARTING..."
              : language === "hr"
              ? "IGRAJ PONOVNO"
              : "PLAY AGAIN"}
          </Button>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-panel2 p-4 text-center text-sm text-white/45">
            {language === "hr"
              ? "Čekamo hosta da pokrene novu igru..."
              : "Waiting for the host to start a new game..."}
          </div>
        )}

        <Button
          variant="secondary"
          onClick={() => {
            playSound("click", 0.4);
            router.push("/");
          }}
        >
          🏠 PARTY GAMES
        </Button>
      </motion.div>
    </main>
  );
}