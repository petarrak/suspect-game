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
import PlayerList from "@/components/PlayerList";
import { useLanguage } from "@/components/LanguageProvider";

import { playSound } from "@/lib/sounds";

import {
  useRoomByIdRealtime,
  getMyPlayerInRoom,
  setPlayerReady,
  startVoting,
} from "@/lib/useRoom";

export default function AnswerPage() {
  const params = useParams();
  const router = useRouter();

  const { language, t } =
    useLanguage();

  const roomId =
    params.roomId as string;

  const {
    room,
    players,
    loading,
    error,
  } =
    useRoomByIdRealtime(
      roomId
    );

  const [
    meId,
    setMeId,
  ] =
    useState<string | null>(
      null
    );

  const [
    meLoading,
    setMeLoading,
  ] = useState(true);

  const [
    readyLoading,
    setReadyLoading,
  ] = useState(false);

  const [
    readyError,
    setReadyError,
  ] =
    useState<string | null>(
      null
    );

  const [
    votingLoading,
    setVotingLoading,
  ] = useState(false);

  const [
    votingError,
    setVotingError,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const player =
          await getMyPlayerInRoom(
            roomId
          );

        if (!cancelled) {
          setMeId(
            player?.id ??
              null
          );
        }
      } catch (e) {
        console.error(
          "Could not load player:",
          e
        );
      } finally {
        if (!cancelled) {
          setMeLoading(
            false
          );
        }
      }
    }

    void loadMe();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const me =
    players.find(
      (player) =>
        player.id === meId
    ) ?? null;

  async function handleReady() {
    if (
      !me ||
      me.is_ready
    ) {
      return;
    }

    setReadyLoading(
      true
    );

    setReadyError(
      null
    );

    try {
      playSound(
        "click",
        0.55
      );

      await setPlayerReady(
        me.id
      );
    } catch (e: any) {
      setReadyError(
        e?.message ??
          (language === "hr"
            ? "Nije te moguće označiti kao spremnog."
            : "Could not mark you ready.")
      );
    } finally {
      setReadyLoading(
        false
      );
    }
  }

  async function handleStartVoting() {
    if (!room) {
      return;
    }

    setVotingLoading(
      true
    );

    setVotingError(
      null
    );

    try {
      playSound(
        "vote",
        0.75
      );

      await startVoting(
        room.id
      );
    } catch (e: any) {
      console.error(
        "startVoting failed:",
        e
      );

      setVotingError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće pokrenuti glasanje."
            : "Could not start voting.")
      );
    } finally {
      setVotingLoading(
        false
      );
    }
  }

  useEffect(() => {
    if (
      room &&
      room.status ===
        "voting"
    ) {
      router.push(
        `/voting/${roomId}`
      );
    }
  }, [
    room,
    roomId,
    router,
  ]);

  if (
    loading ||
    meLoading
  ) {
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
              repeat:
                Infinity,
            }}
          >
            💬
          </motion.div>

          <p className="mt-4 text-white/50">
            {language === "hr"
              ? "Učitavanje..."
              : "Loading..."}
          </p>
        </motion.div>
      </main>
    );
  }

  if (
    error ||
    !room
  ) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-accent">
          {error ??
            (language === "hr"
              ? "Soba nije pronađena."
              : "Room not found.")}
        </p>

        <Button
          variant="secondary"
          onClick={() =>
            router.push("/")
          }
        >
          {t("backHome")}
        </Button>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-accent">
          {language === "hr"
            ? "Nisi dio ove sobe na ovom uređaju."
            : "You're not part of this room on this device."}
        </p>

        <Button
          variant="secondary"
          onClick={() =>
            router.push("/")
          }
        >
          {t("backHome")}
        </Button>
      </main>
    );
  }

  const readyCount =
    players.filter(
      (player) =>
        player.is_ready
    ).length;

  const readyProgress =
    players.length > 0
      ? Math.min(
          100,
          (readyCount /
            players.length) *
            100
        )
      : 0;

  return (
    <motion.main
      className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6"
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.3,
      }}
    >
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

        <h1 className="mt-2 text-3xl font-black">
          {t("answerTime")}
        </h1>

        <p className="mt-2 text-white/50">
          {t("answerOutLoud")}
        </p>
      </motion.div>

      <motion.div
        className="rounded-2xl border border-white/10 bg-black/20 p-4"
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.1,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-white/40">
            {language === "hr"
              ? "SPREMNI"
              : "READY"}
          </span>

          <span className="font-black text-accent">
            {readyCount}/
            {players.length}
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{
              width:
                `${readyProgress}%`,
            }}
            transition={{
              duration: 0.35,
            }}
          />
        </div>

        <p className="mt-2 text-xs text-white/30">
          {readyCount}/
          {players.length}{" "}
          {language === "hr"
            ? "igrača spremno"
            : "players ready"}
        </p>
      </motion.div>

      <motion.div
        className="flex flex-col gap-3"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.15,
        }}
      >
        <PlayerList
          players={players}
          meId={meId}
          showBadge={(
            player
          ) =>
            player.is_ready
              ? language ===
                "hr"
                ? "🟢 Spreman"
                : "🟢 Ready"
              : language ===
                "hr"
              ? "🟡 Odgovara..."
              : "🟡 Answering..."
          }
        />
      </motion.div>

      {me.is_ready && (
        <motion.div
          className="rounded-2xl border border-green-400/20 bg-green-400/10 p-4 text-center"
          initial={{
            opacity: 0,
            scale: 0.95,
            y: 10,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
        >
          <p className="font-black text-green-300">
            ✅{" "}
            {language === "hr"
              ? "SPREMAN SI"
              : "YOU'RE READY"}
          </p>

          <p className="mt-2 text-sm text-white/40">
            {language === "hr"
              ? "Čekamo ostale igrače."
              : "Waiting for the other players."}
          </p>
        </motion.div>
      )}

      {readyError && (
        <p className="text-center text-accent text-sm">
          {readyError}
        </p>
      )}

      {votingError && (
        <p className="text-center text-accent text-sm">
          {votingError}
        </p>
      )}

      <motion.div
        className="mt-auto flex flex-col gap-3 pb-4"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.25,
        }}
      >
        <Button
          onClick={
            handleReady
          }
          disabled={
            me.is_ready ||
            readyLoading
          }
        >
          {me.is_ready
            ? t("youreReady")
            : readyLoading
            ? language === "hr"
              ? "Označavanje..."
              : "Marking ready..."
            : t("imReady")}
        </Button>

        {me.is_host && (
          <Button
            variant="secondary"
            onClick={
              handleStartVoting
            }
            disabled={
              votingLoading
            }
          >
            {votingLoading
              ? language === "hr"
                ? "Pokretanje glasanja..."
                : "Starting voting..."
              : `🗳️ ${t(
                  "startVoting"
                )}`}
          </Button>
        )}
      </motion.div>
    </motion.main>
  );
}