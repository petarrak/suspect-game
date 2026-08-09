"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  const { language, t } = useLanguage();

  const roomId = params.roomId as string;

  const { room, players, loading, error } =
    useRoomByIdRealtime(roomId);

  const [meId, setMeId] =
    useState<string | null>(null);

  const [meLoading, setMeLoading] =
    useState(true);

  const [readyLoading, setReadyLoading] =
    useState(false);

  const [readyError, setReadyError] =
    useState<string | null>(null);

  const [votingLoading, setVotingLoading] =
    useState(false);

  const [votingError, setVotingError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const player =
          await getMyPlayerInRoom(roomId);

        if (!cancelled) {
          setMeId(player?.id ?? null);
        }
      } catch (e) {
        console.error(
          "Could not load player:",
          e
        );
      } finally {
        if (!cancelled) {
          setMeLoading(false);
        }
      }
    }

    loadMe();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const me =
    players.find(
      (p) => p.id === meId
    ) ?? null;

  async function handleReady() {
    if (!me || me.is_ready) return;

    setReadyLoading(true);
    setReadyError(null);

    try {
      await setPlayerReady(me.id);
    } catch (e: any) {
      setReadyError(
        e?.message ??
          (language === "hr"
            ? "Nije te moguće označiti kao spremnog."
            : "Could not mark you ready.")
      );
    } finally {
      setReadyLoading(false);
    }
  }

  async function handleStartVoting() {
    if (!room) return;

    setVotingLoading(true);
    setVotingError(null);

    try {
      playSound("vote");

      await startVoting(room.id);
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
      setVotingLoading(false);
    }
  }

  useEffect(() => {
    if (
      room &&
      room.status === "voting"
    ) {
      router.push(
        `/voting/${roomId}`
      );
    }
  }, [room, roomId, router]);

  if (loading || meLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-white/50">
          {language === "hr"
            ? "Učitavanje..."
            : "Loading..."}
        </p>
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
        <p className="text-accent text-center">
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
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
        <p className="text-accent text-center">
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
      (p) => p.is_ready
    ).length;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <div className="text-center pt-4">
        <h1 className="text-3xl font-black">
          {t("answerTime")}
        </h1>

        <p className="text-white/50 mt-2">
          {t("answerOutLoud")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-widest text-white/40">
          {readyCount}/{players.length}{" "}
          {language === "hr"
            ? "igrača spremno"
            : "players ready"}
        </span>

        <PlayerList
          players={players}
          meId={meId}
          showBadge={(p) =>
            p.is_ready
              ? language === "hr"
                ? "🟢 Spreman"
                : "🟢 Ready"
              : language === "hr"
              ? "🟡 Odgovara..."
              : "🟡 Answering..."
          }
        />
      </div>

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

      <div className="mt-auto flex flex-col gap-3">
        <Button
          onClick={handleReady}
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
              : t("startVoting")}
          </Button>
        )}
      </div>
    </main>
  );
}