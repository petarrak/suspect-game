"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import {
  playSound,
  stopSound,
} from "@/lib/sounds";
import {
  getMyPlayerInRoom,
  getRoomById,
  getMyRoundQuestion,
} from "@/lib/useRoom";

const COUNTDOWN_SECONDS = 10;

export default function QuestionPage() {
  const params = useParams();
  const router = useRouter();
  const { language, t } = useLanguage();

  const roomId = params.roomId as string;

  const [questionText, setQuestionText] =
    useState<string | null>(null);

  const [roundNumber, setRoundNumber] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [countdown, setCountdown] =
    useState(COUNTDOWN_SECONDS);

  const hasNavigated = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const room =
          await getRoomById(roomId);

        if (!room) {
          throw new Error(
            language === "hr"
              ? "Ta soba ne postoji."
              : "That room doesn't exist."
          );
        }

        if (!room.current_round_id) {
          throw new Error(
            language === "hr"
              ? "Ova soba još nema aktivnu rundu."
              : "This room doesn't have an active round yet."
          );
        }

        const player =
          await getMyPlayerInRoom(roomId);

        if (!player) {
          throw new Error(
            language === "hr"
              ? "Nisi dio ove sobe na ovom uređaju."
              : "You're not part of this room on this device."
          );
        }

        const roundQuestion =
          await getMyRoundQuestion(
            room.current_round_id,
            player.id
          );

        if (!roundQuestion) {
          throw new Error(
            language === "hr"
              ? "Tvoje pitanje još nije spremno. Pokušaj ponovno za trenutak."
              : "Your question isn't ready yet. Try again in a moment."
          );
        }

        if (cancelled) return;

        setQuestionText(
          roundQuestion.question_text
        );

        setRoundNumber(
          room.current_round
        );

        setCountdown(
          COUNTDOWN_SECONDS
        );

        hasNavigated.current = false;

        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;

        setError(
          e?.message ??
            (language === "hr"
              ? "Došlo je do greške pri učitavanju pitanja."
              : "Something went wrong loading your question.")
        );

        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      stopSound("tick");
    };
  }, [roomId, language]);

  useEffect(() => {
    if (
      loading ||
      error
    ) {
      return;
    }

    if (countdown <= 0) {
      stopSound("tick");

      if (!hasNavigated.current) {
        hasNavigated.current = true;

        router.push(
          `/answer/${roomId}`
        );
      }

      return;
    }

    // Tick only on 5, 4, 3, 2 and 1.
    if (countdown <= 5) {
      playSound("tick");

      const stopTickTimer =
        window.setTimeout(() => {
          stopSound("tick");
        }, 250);

      const countdownTimer =
        window.setTimeout(() => {
          setCountdown(
            (current) =>
              current - 1
          );
        }, 1000);

      return () => {
        window.clearTimeout(
          stopTickTimer
        );

        window.clearTimeout(
          countdownTimer
        );

        stopSound("tick");
      };
    }

    const timer =
      window.setTimeout(() => {
        setCountdown(
          (current) =>
            current - 1
        );
      }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    countdown,
    loading,
    error,
    roomId,
    router,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/50">
          {language === "hr"
            ? "Učitavanje tvog pitanja..."
            : "Loading your question..."}
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">

        <p className="text-accent text-center">
          {error}
        </p>

        <button
          type="button"
          className="btn-secondary w-auto px-6"
          onClick={() =>
            router.push("/")
          }
        >
          {t("backHome")}
        </button>

      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-8 p-6">

      <div className="text-center pt-4">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">
          {t("round")} {roundNumber}
        </p>
      </div>

      <div className="card px-6 py-10 flex flex-col items-center gap-4 text-center">

        <span className="text-xs uppercase tracking-widest text-white/40">
          {language === "hr"
            ? "Tvoje pitanje"
            : "Your question"}
        </span>

        <p className="text-2xl font-semibold leading-snug">
          {questionText}
        </p>

      </div>

      <p className="text-center text-white/40 text-sm">
        {language === "hr"
          ? "Nemoj nikome pokazivati ovaj ekran."
          : "Don't show this screen to anyone."}
      </p>

      <div className="mt-auto flex flex-col items-center gap-2">

        <span
          className={`font-bold text-accent transition-all ${
            countdown <= 5
              ? "text-6xl scale-110"
              : "text-4xl"
          }`}
        >
          {countdown}
        </span>

        <span className="text-white/40 text-sm">
          {language === "hr"
            ? "Automatski nastavljamo..."
            : "Continuing automatically..."}
        </span>

      </div>

    </main>
  );
}