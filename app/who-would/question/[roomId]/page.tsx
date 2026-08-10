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

import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";

import { playSound } from "@/lib/sounds";
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

  const [
    room,
    setRoom,
  ] =
    useState<WhoWouldRoom | null>(
      null
    );

  const [
    me,
    setMe,
  ] =
    useState<WhoWouldPlayer | null>(
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
    loading,
    setLoading,
  ] = useState(true);

  const [
    opening,
    setOpening,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const questionSoundPlayed =
    useRef(false);

  const voteSoundPlayed =
    useRef(false);

  function goToVoting(
    targetRoomId: string
  ) {
    if (
      !voteSoundPlayed.current
    ) {
      voteSoundPlayed.current =
        true;

      playSound(
        "vote",
        0.75
      );
    }

    router.replace(
      `/who-would/voting/${targetRoomId}`
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
          freshQuestion,
        ] =
          await Promise.all([
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

        if (cancelled) {
          return;
        }

        if (
          !freshRoom ||
          !freshMe
        ) {
          throw new Error(
            language === "hr"
              ? "Nije moguće učitati pitanje."
              : "Could not load question."
          );
        }

        setRoom(
          freshRoom
        );

        setMe(
          freshMe
        );

        setQuestion(
          freshQuestion
        );

        if (
          freshRoom.status ===
          "voting"
        ) {
          goToVoting(
            roomId
          );
        }

        if (
          freshRoom.status ===
          "reveal"
        ) {
          router.replace(
            `/who-would/reveal/${roomId}`
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati pitanje."
                : "Could not load question.")
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
    if (
      loading ||
      !question ||
      questionSoundPlayed.current
    ) {
      return;
    }

    questionSoundPlayed.current =
      true;

    const timer =
      window.setTimeout(
        () => {
          playSound(
            "reveal",
            0.65
          );
        },
        250
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    loading,
    question,
  ]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `who-would-question-${roomId}`
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
              "voting"
            ) {
              goToVoting(
                roomId
              );
            }

            if (
              updated.status ===
              "reveal"
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
      playSound(
        "vote",
        0.75
      );

      voteSoundPlayed.current =
        true;

      await openWhoWouldVoting(
        roomId
      );

      router.replace(
        `/who-would/voting/${roomId}`
      );
    } catch (e: any) {
      voteSoundPlayed.current =
        false;

      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće otvoriti glasanje."
            : "Could not open voting.")
      );

      setOpening(
        false
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
              duration: 1.6,
              repeat: Infinity,
            }}
          >
            🤔
          </motion.div>

          <p className="mt-4 text-white/50">
            {language === "hr"
              ? "Učitavanje pitanja..."
              : "Loading question..."}
          </p>
        </motion.div>
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
      <motion.div
        className="text-center pt-5"
        initial={{
          opacity: 0,
          y: -20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <motion.p
          className="text-xs font-black uppercase tracking-[0.25em] text-accent"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.1,
          }}
        >
          😂 WHO WOULD?
        </motion.p>

        <motion.p
          className="mt-2 text-sm text-white/35"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.2,
          }}
        >
          {language === "hr"
            ? "RUNDA"
            : "ROUND"}{" "}
          {question.round_number}
          {" / "}
          {question.total_rounds}
        </motion.p>
      </motion.div>

      <motion.section
        className="relative mt-auto mb-auto overflow-hidden rounded-3xl border border-accent/30 bg-accent/10 p-8 text-center shadow-2xl shadow-accent/10"
        initial={{
          opacity: 0,
          scale: 0.75,
          y: 30,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        transition={{
          delay: 0.2,
          type: "spring",
          stiffness: 160,
          damping: 14,
        }}
      >
        <motion.div
          className="absolute left-5 top-5 text-xl"
          initial={{
            opacity: 0,
            scale: 0,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 0.65,
          }}
        >
          ✨
        </motion.div>

        <motion.div
          className="absolute right-5 top-6 text-xl"
          initial={{
            opacity: 0,
            scale: 0,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 0.75,
          }}
        >
          ✨
        </motion.div>

        <motion.div
          className="text-6xl"
          initial={{
            scale: 0,
            rotate: -15,
          }}
          animate={{
            scale: 1,
            rotate: 0,
          }}
          transition={{
            delay: 0.35,
            type: "spring",
            stiffness: 220,
            damping: 12,
          }}
        >
          🤔
        </motion.div>

        <motion.p
          className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-white/35"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.5,
          }}
        >
          {language === "hr"
            ? "TKO BI..."
            : "WHO WOULD..."}
        </motion.p>

        <motion.h1
          className="mt-4 text-3xl font-black leading-tight"
          initial={{
            opacity: 0,
            y: 15,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            delay: 0.65,
            type: "spring",
          }}
        >
          {text}
        </motion.h1>
      </motion.section>

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <motion.div
        className="pb-4"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.85,
        }}
      >
        {me.is_host ? (
          <Button
            onClick={
              handleOpenVoting
            }
            disabled={
              opening
            }
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
          <motion.div
            className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
          >
            <p className="text-sm text-white/35">
              {language === "hr"
                ? "Čekamo hosta da otvori glasanje..."
                : "Waiting for the host to open voting..."}
            </p>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}