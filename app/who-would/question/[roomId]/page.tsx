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
  getMyWhoWouldPlayerInRoom,
  getWhoWouldQuestion,
  getWhoWouldRoomById,
  openWhoWouldVoting,
  type WhoWouldPlayer,
  type WhoWouldQuestion,
  type WhoWouldRoom,
} from "@/lib/whoWould";

export default function WhoWouldQuestionPage() {
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
    useState<WhoWouldRoom | null>(
      null
    );

  const [me, setMe] =
    useState<WhoWouldPlayer | null>(
      null
    );

  const [question, setQuestion] =
    useState<WhoWouldQuestion | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [opening, setOpening] =
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
          freshQuestion,
        ] = await Promise.all([
          getWhoWouldRoomById(
            roomId
          ),
          getMyWhoWouldPlayerInRoom(
            roomId
          ),
          getWhoWouldQuestion(
            roomId
          ),
        ]);

        if (cancelled) return;

        if (!freshRoom || !freshMe) {
          throw new Error(
            language === "hr"
              ? "Nije moguće učitati pitanje."
              : "Could not load question."
          );
        }

        setRoom(freshRoom);
        setMe(freshMe);
        setQuestion(
          freshQuestion
        );

        if (
          freshRoom.status === "voting"
        ) {
          router.replace(
            `/who-would/voting/${roomId}`
          );
        }

        if (
          freshRoom.status === "reveal"
        ) {
          router.replace(
            `/who-would/reveal/${roomId}`
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              "Could not load question."
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
        `who-would-question-${roomId}`
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
            updated.status === "voting"
          ) {
            router.replace(
              `/who-would/voting/${roomId}`
            );
          }

          if (
            updated.status === "reveal"
          ) {
            router.replace(
              `/who-would/reveal/${roomId}`
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

  async function handleOpenVoting() {
    if (
      !roomId ||
      !me?.is_host ||
      opening
    ) {
      return;
    }

    setOpening(true);
    setError(null);

    try {
      await openWhoWouldVoting(
        roomId
      );

      router.replace(
        `/who-would/voting/${roomId}`
      );
    } catch (e: any) {
      setError(
        e?.message ??
          "Could not open voting."
      );

      setOpening(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-white/50">
          {language === "hr"
            ? "Učitavanje pitanja..."
            : "Loading question..."}
        </p>
      </main>
    );
  }

  if (
    error &&
    !question
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
    !room ||
    !me
  ) {
    return null;
  }

  const text =
    language === "hr"
      ? question.question_hr
      : question.question_en;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <div className="text-center pt-5">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          😂 WHO WOULD?
        </p>

        <p className="mt-2 text-sm text-white/35">
          {language === "hr"
            ? "RUNDA"
            : "ROUND"}{" "}
          {question.round_number}
          {" / "}
          {question.total_rounds}
        </p>
      </div>

      <motion.section
        className="mt-auto mb-auto rounded-3xl border border-accent/30 bg-accent/10 p-8 text-center shadow-2xl shadow-accent/10"
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
          🤔
        </div>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-white/35">
          {language === "hr"
            ? "TKO BI..."
            : "WHO WOULD..."}
        </p>

        <h1 className="mt-4 text-3xl font-black leading-tight">
          {text}
        </h1>
      </motion.section>

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <div className="pb-4">
        {me.is_host ? (
          <Button
            onClick={handleOpenVoting}
            disabled={opening}
          >
            {opening
              ? language === "hr"
                ? "OTVARANJE..."
                : "OPENING..."
              : language === "hr"
              ? "🗳️ OTVORI GLASANJE"
              : "🗳️ OPEN VOTING"}
          </Button>
        ) : (
          <p className="text-center text-sm text-white/35">
            {language === "hr"
              ? "Čekamo hosta da otvori glasanje..."
              : "Waiting for the host to open voting..."}
          </p>
        )}
      </div>
    </main>
  );
}