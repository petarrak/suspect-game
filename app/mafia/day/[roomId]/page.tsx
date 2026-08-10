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
  getMafiaDayResult,
  getMafiaRoomById,
  getMyMafiaPlayerInRoom,
  type MafiaDayResult,
  type MafiaPlayer,
  type MafiaRoom,
} from "@/lib/mafia";

export default function MafiaDayPage() {
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
    result,
    setResult,
  ] =
    useState<MafiaDayResult | null>(
      null
    );

  const [
    room,
    setRoom,
  ] =
    useState<MafiaRoom | null>(
      null
    );

  const [
    me,
    setMe,
  ] =
    useState<MafiaPlayer | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    starting,
    setStarting,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const morningSoundPlayed =
    useRef(false);

  const resultSoundPlayed =
    useRef(false);

  useEffect(() => {
    if (!roomId) {
      setError(
        language === "hr"
          ? "Nedostaje ID sobe."
          : "Missing room ID."
      );

      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [
          freshResult,
          freshRoom,
          freshMe,
        ] =
          await Promise.all([
            getMafiaDayResult(
              roomId
            ),

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

        if (!freshRoom) {
          throw new Error(
            language === "hr"
              ? "Soba ne postoji."
              : "Room not found."
          );
        }

        if (!freshMe) {
          throw new Error(
            language === "hr"
              ? "Nisi dio ove sobe."
              : "You're not part of this room."
          );
        }

        setResult(
          freshResult
        );

        setRoom(
          freshRoom
        );

        setMe(
          freshMe
        );

        if (
          freshRoom.status ===
          "discussion"
        ) {
          router.replace(
            `/mafia/discussion/${roomId}`
          );

          return;
        }

        if (
          freshRoom.status ===
          "voting"
        ) {
          router.replace(
            `/mafia/voting/${roomId}`
          );

          return;
        }

        if (
          freshRoom.status ===
          "reveal"
        ) {
          router.replace(
            `/mafia/reveal/${roomId}`
          );

          return;
        }

        if (
          freshRoom.status ===
          "ended"
        ) {
          router.replace(
            `/mafia/results/${roomId}`
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati jutarnji rezultat."
                : "Could not load morning result.")
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
    if (
      loading ||
      !result ||
      morningSoundPlayed.current
    ) {
      return;
    }

    morningSoundPlayed.current =
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
    result,
  ]);

  useEffect(() => {
    if (
      loading ||
      !result ||
      resultSoundPlayed.current
    ) {
      return;
    }

    resultSoundPlayed.current =
      true;

    const timer =
      window.setTimeout(
        () => {
          if (
            result.nobody_died
          ) {
            playSound(
              "click",
              0.6
            );
          } else {
            playSound(
              "caught",
              0.8
            );
          }
        },
        950
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    loading,
    result,
  ]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `mafia-day-room-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
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
              "discussion"
            ) {
              router.replace(
                `/mafia/discussion/${roomId}`
              );

              return;
            }

            if (
              updated.status ===
              "voting"
            ) {
              router.replace(
                `/mafia/voting/${roomId}`
              );

              return;
            }

            if (
              updated.status ===
              "reveal"
            ) {
              router.replace(
                `/mafia/reveal/${roomId}`
              );

              return;
            }

            if (
              updated.status ===
              "ended"
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

  async function handleStartDiscussion() {
    if (
      !roomId ||
      !room ||
      !me?.is_host ||
      starting
    ) {
      return;
    }

    setStarting(true);
    setError(null);

    try {
      playSound(
        "start",
        0.7
      );

      const {
        error: rpcError,
      } =
        await supabase.rpc(
          "start_mafia_discussion",
          {
            p_room_id:
              roomId,
          }
        );

      if (rpcError) {
        throw new Error(
          rpcError.message
        );
      }

      router.replace(
        `/mafia/discussion/${roomId}`
      );
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće pokrenuti raspravu."
            : "Could not start discussion.")
      );

      setStarting(false);
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
            className="text-7xl"
            initial={{
              opacity: 0,
              scale: 0.7,
            }}
            animate={{
              opacity: 1,
              scale: [
                1,
                1.08,
                1,
              ],
            }}
            transition={{
              opacity: {
                duration: 0.4,
              },
              scale: {
                duration: 1.8,
                repeat:
                  Infinity,
              },
            }}
          >
            🌅
          </motion.div>

          <p className="mt-4 text-white/50">
            {language === "hr"
              ? "Sunce izlazi..."
              : "The sun is rising..."}
          </p>
        </motion.div>
      </main>
    );
  }

  if (
    error &&
    !result
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
    !result ||
    !room ||
    !me
  ) {
    return null;
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-7 p-6">
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
        transition={{
          duration: 0.45,
        }}
      >
        <motion.div
          className="text-7xl"
          initial={{
            opacity: 0,
            scale: 0.4,
            rotate: -20,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            rotate: 0,
          }}
          transition={{
            delay: 0.1,
            type: "spring",
            stiffness: 180,
            damping: 12,
          }}
        >
          ☀️
        </motion.div>

        <motion.p
          className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-accent"
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
          {language === "hr"
            ? "DAN"
            : "DAY"}{" "}
          {result.day_number}
        </motion.p>

        <motion.h1
          className="mt-3 text-4xl font-black"
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.4,
          }}
        >
          {language === "hr"
            ? "SVANULO JE"
            : "MORNING HAS COME"}
        </motion.h1>
      </motion.div>

      {result.nobody_died ? (
        <motion.section
          className="relative overflow-hidden rounded-3xl border border-green-400/25 bg-green-400/10 p-8 text-center"
          initial={{
            opacity: 0,
            scale: 0.82,
            y: 30,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{
            delay: 0.6,
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
              delay: 1.05,
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
              delay: 1.15,
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
              delay: 0.75,
              type: "spring",
              stiffness: 220,
              damping: 12,
            }}
          >
            🛡️
          </motion.div>

          <motion.h2
            className="mt-4 text-2xl font-black text-green-300"
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.9,
            }}
          >
            {language === "hr"
              ? "NITKO NIJE UMRO"
              : "NOBODY DIED"}
          </motion.h2>

          <motion.p
            className="mt-3 text-white/50"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 1.05,
            }}
          >
            {language === "hr"
              ? "Doktor je možda spasio metu. Vrijeme je da pronađete Mafiju."
              : "The Doctor may have saved the target. Time to find the Mafia."}
          </motion.p>
        </motion.section>
      ) : (
        <motion.section
          className="relative overflow-hidden rounded-3xl border border-red-400/25 bg-red-400/10 p-8 text-center"
          initial={{
            opacity: 0,
            scale: 0.82,
            y: 30,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{
            delay: 0.6,
            type: "spring",
            stiffness: 160,
            damping: 14,
          }}
        >
          <motion.div
            className="text-3xl"
            initial={{
              opacity: 0,
              scale: 2,
            }}
            animate={{
              opacity: [
                0,
                1,
                0.35,
              ],
              scale: [
                2,
                1,
                1,
              ],
            }}
            transition={{
              delay: 0.65,
              duration: 0.5,
            }}
          >
            💀
          </motion.div>

          <motion.div
            className="mt-3 text-6xl"
            initial={{
              opacity: 0,
              scale: 0,
              rotate: -10,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
            }}
            transition={{
              delay: 0.85,
              type: "spring",
              stiffness: 200,
              damping: 13,
            }}
          >
            {result.killed_avatar}
          </motion.div>

          <motion.p
            className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-white/35"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 1,
            }}
          >
            {language === "hr"
              ? "TIJEKOM NOĆI STRADAO JE"
              : "DURING THE NIGHT"}
          </motion.p>

          <motion.h2
            className="mt-2 text-3xl font-black"
            initial={{
              opacity: 0,
              y: 15,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              delay: 1.1,
              type: "spring",
            }}
          >
            {result.killed_nickname}
          </motion.h2>

          <motion.p
            className="mt-3 font-black text-red-300"
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              delay: 1.25,
            }}
          >
            💀{" "}
            {language === "hr"
              ? "ELIMINIRAN"
              : "ELIMINATED"}
          </motion.p>
        </motion.section>
      )}

      <motion.section
        className="rounded-2xl border border-white/10 bg-panel2 p-5"
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 1.35,
        }}
      >
        <p className="font-black">
          💬{" "}
          {language === "hr"
            ? "DNEVNA RASPRAVA"
            : "DAY DISCUSSION"}
        </p>

        <p className="mt-2 text-sm text-white/40">
          {language === "hr"
            ? `Imat ćete ${room.discussion_time} sekundi za raspravu prije glasanja.`
            : `You'll have ${room.discussion_time} seconds to discuss before voting.`}
        </p>
      </motion.section>

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <motion.div
        className="mt-auto pb-4"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 1.45,
        }}
      >
        {me.is_host ? (
          <Button
            onClick={
              handleStartDiscussion
            }
            disabled={
              starting
            }
          >
            {starting
              ? language === "hr"
                ? "POKRETANJE..."
                : "STARTING..."
              : language === "hr"
              ? "💬 POKRENI RASPRAVU"
              : "💬 START DISCUSSION"}
          </Button>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
            <p className="text-sm text-white/40">
              {language === "hr"
                ? "Čekamo hosta da pokrene raspravu..."
                : "Waiting for the host to start discussion..."}
            </p>
          </div>
        )}
      </motion.div>
    </main>
  );
}