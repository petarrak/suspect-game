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

import {
  playSound,
  stopSound,
} from "@/lib/sounds";

import {
  getMyPlayerInRoom,
  getRoomById,
  getMyRoundQuestion,
  advanceQuestionToAnswering,
} from "@/lib/useRoom";

export default function QuestionPage() {
  const params = useParams();
  const router = useRouter();

  const { language, t } =
    useLanguage();

  const roomId =
    params.roomId as string;

  const [
    questionText,
    setQuestionText,
  ] = useState<string | null>(
    null
  );

  const [
    roundNumber,
    setRoundNumber,
  ] = useState<number | null>(
    null
  );

  const [
    questionTime,
    setQuestionTime,
  ] = useState(20);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    countdown,
    setCountdown,
  ] = useState(20);

  const hasNavigated =
    useRef(false);

  const transitionRunning =
    useRef(false);

  const revealSoundPlayed =
    useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const room =
          await getRoomById(
            roomId
          );

        if (!room) {
          throw new Error(
            language === "hr"
              ? "Ta soba ne postoji."
              : "That room doesn't exist."
          );
        }

        if (
          !room.current_round_id
        ) {
          throw new Error(
            language === "hr"
              ? "Ova soba još nema aktivnu rundu."
              : "This room doesn't have an active round yet."
          );
        }

        const player =
          await getMyPlayerInRoom(
            roomId
          );

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

        if (cancelled) {
          return;
        }

        setQuestionText(
          roundQuestion.question_text
        );

        setRoundNumber(
          room.current_round
        );

        const seconds =
          room.question_time ??
          20;

        setQuestionTime(
          seconds
        );

        setCountdown(
          seconds
        );

        hasNavigated.current =
          false;

        revealSoundPlayed.current =
          false;

        setLoading(false);
      } catch (e: any) {
        if (cancelled) {
          return;
        }

        setError(
          e?.message ??
            (language === "hr"
              ? "Došlo je do greške pri učitavanju pitanja."
              : "Something went wrong loading your question.")
        );

        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;

      stopSound(
        "tick"
      );
    };
  }, [
    roomId,
    language,
  ]);

  useEffect(() => {
    if (
      loading ||
      error ||
      !questionText ||
      revealSoundPlayed.current
    ) {
      return;
    }

    revealSoundPlayed.current =
      true;

    const timer =
      window.setTimeout(
        () => {
          playSound(
            "reveal",
            0.65
          );
        },
        200
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    loading,
    error,
    questionText,
  ]);

  useEffect(() => {
    if (
      loading ||
      error
    ) {
      return;
    }

    if (countdown <= 0) {
      stopSound(
        "tick"
      );

      if (
        !hasNavigated.current &&
        !transitionRunning.current
      ) {
        transitionRunning.current = true;

        void (async () => {
          try {
            await advanceQuestionToAnswering(
              roomId
            );

            hasNavigated.current = true;

            router.replace(
              `/answer/${roomId}`
            );
          } catch (e: any) {
            transitionRunning.current = false;

            setError(
              e?.message ??
                (language === "hr"
                  ? "Nije moguće nastaviti na odgovore."
                  : "Could not continue to answers.")
            );
          }
        })();
      }

      return;
    }

    if (
      countdown <= 5
    ) {
      playSound(
        "tick",
        0.65
      );

      const stopTickTimer =
        window.setTimeout(
          () => {
            stopSound(
              "tick"
            );
          },
          250
        );

      const countdownTimer =
        window.setTimeout(
          () => {
            setCountdown(
              (current) =>
                current - 1
            );
          },
          1000
        );

      return () => {
        window.clearTimeout(
          stopTickTimer
        );

        window.clearTimeout(
          countdownTimer
        );

        stopSound(
          "tick"
        );
      };
    }

    const timer =
      window.setTimeout(
        () => {
          setCountdown(
            (current) =>
              current - 1
          );
        },
        1000
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    countdown,
    loading,
    error,
    roomId,
    router,
    language,
  ]);

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
            🕵️
          </motion.div>

          <p className="mt-4 text-white/50">
            {language === "hr"
              ? "Učitavanje tvog pitanja..."
              : "Loading your question..."}
          </p>
        </motion.div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-accent">
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
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <motion.div
        className="text-center pt-5"
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
          🕵️ SUSPECT
        </p>

        <p className="mt-2 text-sm text-white/35">
          {t("round")}{" "}
          {roundNumber}
        </p>
      </motion.div>

      <motion.div
        className="card mt-auto mb-auto px-6 py-10 flex flex-col items-center gap-4 text-center"
        initial={{
          opacity: 0,
          scale: 0.8,
          y: 30,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        transition={{
          type: "spring",
          stiffness: 160,
          damping: 14,
        }}
      >
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
            delay: 0.15,
            type: "spring",
            stiffness: 220,
          }}
        >
          ❓
        </motion.div>

        <motion.span
          className="text-xs uppercase tracking-widest text-white/40"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.25,
          }}
        >
          {language === "hr"
            ? "Tvoje pitanje"
            : "Your question"}
        </motion.span>

        <motion.p
          className="text-2xl font-semibold leading-snug"
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.35,
          }}
        >
          {questionText}
        </motion.p>
      </motion.div>

      <motion.p
        className="text-center text-white/40 text-sm"
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 0.45,
        }}
      >
        {language === "hr"
          ? "Nemoj nikome pokazivati ovaj ekran."
          : "Don't show this screen to anyone."}
      </motion.p>

      <motion.div
        className="mt-auto flex flex-col items-center gap-2 pb-4"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.5,
        }}
      >
        <motion.span
          key={countdown}
          initial={
            countdown <= 5
              ? {
                  scale: 1.25,
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
          className={`font-bold text-accent tabular-nums ${
            countdown <= 5
              ? "text-6xl"
              : "text-4xl"
          }`}
        >
          {countdown}
        </motion.span>

        <span className="text-white/40 text-sm">
          {language === "hr"
            ? `Host je postavio ${questionTime} sekundi.`
            : `Host set ${questionTime} seconds.`}
        </span>

        <span className="text-white/30 text-xs">
          {language === "hr"
            ? "Automatski nastavljamo..."
            : "Continuing automatically..."}
        </span>
      </motion.div>
    </main>
  );
}