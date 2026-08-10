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
  finishMafiaDiscussionIfDue,
  getMafiaRoomById,
  getMyMafiaPlayerInRoom,
  type MafiaPlayer,
  type MafiaRoom,
} from "@/lib/mafia";

export default function MafiaDiscussionPage() {
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
    useState<MafiaRoom | null>(
      null
    );

  const [me, setMe] =
    useState<MafiaPlayer | null>(
      null
    );

  const [
    remaining,
    setRemaining,
  ] = useState(0);

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

  const finishRequested =
    useRef(false);

  const lastTickSecond =
    useRef<number | null>(
      null
    );

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
      `/mafia/voting/${targetRoomId}`
    );
  }

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled =
      false;

    async function load() {
      try {
        const [
          freshRoom,
          freshMe,
        ] =
          await Promise.all([
            getMafiaRoomById(
              roomId
            ),
            getMyMafiaPlayerInRoom(
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
              ? "Nije moguće učitati raspravu."
              : "Could not load discussion."
          );
        }

        setRoom(
          freshRoom
        );

        setMe(
          freshMe
        );

        if (
          freshRoom.status ===
          "voting"
        ) {
          goToVoting(
            roomId
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati raspravu."
                : "Could not load discussion.")
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
          `mafia-discussion-room-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",
            schema:
              "public",
            table:
              "mafia_rooms",
            filter:
              `id=eq.${roomId}`,
          },
          (payload) => {
            const updated =
              payload.new as MafiaRoom;

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
      !room ||
      room.status !==
        "discussion" ||
      !room.discussion_started_at
    ) {
      return;
    }

    finishRequested.current =
      false;

    lastTickSecond.current =
      null;

    voteSoundPlayed.current =
      false;

    const currentRoomId =
      room.id;

    const startedAt =
      room.discussion_started_at;

    const discussionTime =
      room.discussion_time;

    function updateCountdown() {
      const endsAt =
        new Date(
          startedAt
        ).getTime() +
        discussionTime *
          1000;

      const secondsLeft =
        Math.max(
          0,
          Math.ceil(
            (
              endsAt -
              Date.now()
            ) /
              1000
          )
        );

      setRemaining(
        secondsLeft
      );

      if (
        secondsLeft > 0 &&
        secondsLeft <= 5 &&
        lastTickSecond.current !==
          secondsLeft
      ) {
        lastTickSecond.current =
          secondsLeft;

        playSound(
          "tick",
          0.65
        );
      }

      if (
        secondsLeft <= 0 &&
        !finishRequested.current
      ) {
        finishRequested.current =
          true;

        void finishMafiaDiscussionIfDue(
          currentRoomId
        )
          .then(
            (
              didFinish
            ) => {
              if (
                didFinish
              ) {
                goToVoting(
                  currentRoomId
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
                "Could not finish Mafia discussion:",
                e
              );

              finishRequested.current =
                false;
            }
          );
      }
    }

    updateCountdown();

    const timer =
      window.setInterval(
        updateCountdown,
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

  const progress =
    useMemo(() => {
      if (
        !room ||
        room.discussion_time <=
          0
      ) {
        return 0;
      }

      return Math.max(
        0,
        Math.min(
          100,
          (remaining /
            room.discussion_time) *
            100
        )
      );
    }, [
      room,
      remaining,
    ]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-white/50">
          {language === "hr"
            ? "Pokrećemo raspravu..."
            : "Starting discussion..."}
        </p>
      </main>
    );
  }

  if (
    error ||
    !room ||
    !me
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-accent">
          {error ??
            (language === "hr"
              ? "Rasprava nije dostupna."
              : "Discussion unavailable.")}
        </p>
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
          ☀️{" "}
          {language === "hr"
            ? "DAN"
            : "DAY"}{" "}
          {room.day_number}
        </p>

        <h1 className="mt-2 text-3xl font-black">
          💬{" "}
          {language === "hr"
            ? "RASPRAVA"
            : "DISCUSSION"}
        </h1>
      </motion.div>

      <motion.section
        className="mt-auto mb-auto flex flex-col items-center text-center"
        initial={{
          opacity: 0,
          scale: 0.95,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
      >
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
          className={`font-black tabular-nums ${
            remaining <= 10
              ? "text-8xl text-accent"
              : "text-7xl"
          }`}
        >
          {remaining}
        </motion.div>

        <p className="mt-3 text-sm uppercase tracking-[0.2em] text-white/35">
          {language === "hr"
            ? "SEKUNDI"
            : "SECONDS"}
        </p>

        <div className="mt-7 h-3 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{
              width:
                `${progress}%`,
            }}
            transition={{
              duration: 0.25,
            }}
          />
        </div>

        <motion.div
          className="mt-8 rounded-3xl border border-white/10 bg-panel2 p-6 text-left"
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.2,
          }}
        >
          <p className="font-black">
            🎭{" "}
            {language === "hr"
              ? "Pronađite Mafiju"
              : "Find the Mafia"}
          </p>

          <p className="mt-3 leading-relaxed text-white/50">
            {language === "hr"
              ? "Razgovarajte o tome što se dogodilo. Mafija mora lagati, a Civili pokušavaju pronaći sumnjive igrače."
              : "Discuss what happened. The Mafia must lie while the Civilians try to find suspicious players."}
          </p>
        </motion.div>
      </motion.section>

      <motion.p
        className="pb-5 text-center text-sm text-white/35"
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 0.3,
        }}
      >
        {remaining <= 5 &&
        remaining > 0
          ? language === "hr"
            ? "⚠️ Glasanje počinje za nekoliko sekundi..."
            : "⚠️ Voting starts in a few seconds..."
          : language === "hr"
          ? "Kad timer završi, glasanje počinje automatski."
          : "Voting starts automatically when the timer ends."}
      </motion.p>
    </main>
  );
}