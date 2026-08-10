"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "react-qr-code";

import Button from "@/components/Button";
import RoomCodeDisplay from "@/components/RoomCodeDisplay";
import { useLanguage } from "@/components/LanguageProvider";

import { playSound } from "@/lib/sounds";

import {
  getRememberedLiarPlayerId,
  kickLiarPlayer,
  LiarCategory,
  startLiarRound,
  updateLiarSettings,
  useLiarRoomRealtime,
} from "@/lib/liar";

const ROUND_OPTIONS = [3, 5, 7, 10];
const TIME_OPTIONS = [30, 45, 60, 90];

const CATEGORIES: {
  value: LiarCategory;
  emoji: string;
  hr: string;
  en: string;
}[] = [
  {
    value: "RANDOM",
    emoji: "🎲",
    hr: "Nasumično",
    en: "Random",
  },
  {
    value: "FOOD",
    emoji: "🍔",
    hr: "Hrana",
    en: "Food",
  },
  {
    value: "MOVIES",
    emoji: "🎬",
    hr: "Filmovi",
    en: "Movies",
  },
  {
    value: "ANIMALS",
    emoji: "🐾",
    hr: "Životinje",
    en: "Animals",
  },
  {
    value: "COUNTRIES",
    emoji: "🌍",
    hr: "Države",
    en: "Countries",
  },
  {
    value: "JOBS",
    emoji: "💼",
    hr: "Poslovi",
    en: "Jobs",
  },
  {
    value: "SPORTS",
    emoji: "⚽",
    hr: "Sport",
    en: "Sports",
  },
  {
    value: "GAMING",
    emoji: "🎮",
    hr: "Gaming",
    en: "Gaming",
  },
];

export default function LiarRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { language, t } = useLanguage();

  const code = (
    params.code as string
  ).toUpperCase();

  const {
    room,
    players,
    loading,
    error,
  } = useLiarRoomRealtime(code);

  const meId =
    getRememberedLiarPlayerId(code);

  const me =
    players.find(
      (player) =>
        player.id === meId
    ) ?? null;

  const [
    settingsLoading,
    setSettingsLoading,
  ] = useState(false);

  const [
    settingsError,
    setSettingsError,
  ] = useState<string | null>(
    null
  );

  const [
    kickingId,
    setKickingId,
  ] = useState<string | null>(
    null
  );

  const [
    startLoading,
    setStartLoading,
  ] = useState(false);

  const [
    startError,
    setStartError,
  ] = useState<string | null>(
    null
  );

  async function changeSettings(
    patch: Parameters<
      typeof updateLiarSettings
    >[1]
  ) {
    if (
      !room ||
      !me?.is_host ||
      settingsLoading
    ) {
      return;
    }

    setSettingsLoading(true);
    setSettingsError(null);

    try {
      await updateLiarSettings(
        room.id,
        patch
      );
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          "Could not update settings."
      );
    } finally {
      setSettingsLoading(false);
    }
  }

  async function handleKick(
    playerId: string
  ) {
    if (
      !room ||
      !me?.is_host ||
      kickingId
    ) {
      return;
    }

    setKickingId(playerId);
    setSettingsError(null);

    try {
      await kickLiarPlayer(
        room.id,
        playerId
      );
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          "Could not kick player."
      );
    } finally {
      setKickingId(null);
    }
  }

  useEffect(() => {
    if (!room) {
      return;
    }

    if (
      room.status === "word"
    ) {
      router.push(
        `/liar/word/${room.id}`
      );
    }
  }, [room, router]);

  async function handleStart() {
    if (
      !room ||
      !me?.is_host ||
      players.length < 3 ||
      startLoading
    ) {
      return;
    }

    setStartLoading(true);
    setStartError(null);

    try {
      // Start sound is triggered directly
      // from the host's click.
      playSound("start", 0.75);

      await startLiarRound(
        room.id
      );
    } catch (e: any) {
      setStartError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće pokrenuti rundu."
            : "Could not start the round.")
      );

      setStartLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/50">
          {language === "hr"
            ? "Učitavanje Liar sobe..."
            : "Loading Liar room..."}
        </p>
      </main>
    );
  }

  if (
    error ||
    !room
  ) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-6">
        <p className="text-accent">
          {error ??
            "Room not found."}
        </p>

        <Button
          variant="secondary"
          onClick={() =>
            router.push("/liar")
          }
        >
          {t("back")}
        </Button>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen max-w-md mx-auto flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-5xl">
          🤥
        </div>

        <h1 className="text-2xl font-black">
          {language === "hr"
            ? "Nisi u ovoj sobi"
            : "You're not in this room"}
        </h1>

        <Button
          onClick={() =>
            router.push(
              `/liar/join?code=${room.code}`
            )
          }
        >
          {language === "hr"
            ? "PRIDRUŽI SE"
            : "JOIN"}
        </Button>
      </main>
    );
  }

  const canStart =
    players.length >= 3;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <div className="text-center pt-3">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          🤥 LIAR
        </p>

        <h1 className="mt-1 text-3xl font-black">
          LOBBY
        </h1>
      </div>

      <RoomCodeDisplay
        code={room.code}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-white p-4">
          <QRCode
            value={`${window.location.origin}/liar/join?code=${room.code}`}
            size={150}
          />
        </div>

        <p className="text-sm text-white/40">
          📱{" "}
          {language === "hr"
            ? "Skeniraj za pridruživanje"
            : "Scan to join"}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-white/35">
          {language === "hr"
            ? "IGRAČI"
            : "PLAYERS"}{" "}
          ({players.length}/12)
        </p>

        {players.map(
          (player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-panel2 px-4 py-3"
            >
              <div className="text-3xl">
                {player.avatar ||
                  "🙂"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">
                  {
                    player.nickname
                  }

                  {player.id ===
                    meId && (
                    <span className="text-white/35">
                      {" "}
                      {language ===
                      "hr"
                        ? "(ti)"
                        : "(you)"}
                    </span>
                  )}
                </p>

                {player.is_host && (
                  <span className="text-[10px] font-black text-yellow-300">
                    HOST
                  </span>
                )}
              </div>

              {me.is_host &&
                !player.is_host && (
                  <button
                    type="button"
                    disabled={
                      kickingId ===
                      player.id
                    }
                    onClick={() =>
                      handleKick(
                        player.id
                      )
                    }
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
                  >
                    {kickingId ===
                    player.id
                      ? "..."
                      : "👢"}
                  </button>
                )}
            </div>
          )
        )}
      </section>

      {me.is_host && (
        <section className="card p-5 flex flex-col gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
              HOST
            </p>

            <h2 className="mt-1 text-xl font-black">
              {language === "hr"
                ? "Postavke Liara"
                : "Liar Settings"}
            </h2>
          </div>

          <div>
            <div className="flex justify-between mb-3">
              <span className="text-sm font-bold">
                {language ===
                "hr"
                  ? "RUNDE"
                  : "ROUNDS"}
              </span>

              <span className="text-accent font-black">
                {
                  room.total_rounds
                }
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {ROUND_OPTIONS.map(
                (rounds) => (
                  <button
                    key={rounds}
                    disabled={
                      settingsLoading
                    }
                    onClick={() =>
                      changeSettings({
                        total_rounds:
                          rounds,
                      })
                    }
                    className={`rounded-xl border py-3 font-black ${
                      room.total_rounds ===
                      rounds
                        ? "border-accent bg-accent/20"
                        : "border-white/10 bg-black/20 text-white/50"
                    }`}
                  >
                    {rounds}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-3">
              <span className="text-sm font-bold">
                {language ===
                "hr"
                  ? "VRIJEME RASPRAVE"
                  : "DISCUSSION TIME"}
              </span>

              <span className="text-accent font-black">
                {
                  room.discussion_time
                }
                s
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {TIME_OPTIONS.map(
                (seconds) => (
                  <button
                    key={seconds}
                    disabled={
                      settingsLoading
                    }
                    onClick={() =>
                      changeSettings({
                        discussion_time:
                          seconds,
                      })
                    }
                    className={`rounded-xl border py-3 text-sm font-black ${
                      room.discussion_time ===
                      seconds
                        ? "border-accent bg-accent/20"
                        : "border-white/10 bg-black/20 text-white/50"
                    }`}
                  >
                    {seconds}s
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-bold">
              {language === "hr"
                ? "KATEGORIJA"
                : "CATEGORY"}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(
                (category) => (
                  <button
                    key={
                      category.value
                    }
                    disabled={
                      settingsLoading
                    }
                    onClick={() =>
                      changeSettings({
                        category:
                          category.value,
                      })
                    }
                    className={`rounded-xl border p-3 text-left ${
                      room.category ===
                      category.value
                        ? "border-accent bg-accent/20"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <span className="text-lg">
                      {
                        category.emoji
                      }
                    </span>{" "}
                    <span className="text-sm font-black">
                      {language ===
                      "hr"
                        ? category.hr
                        : category.en}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {settingsError && (
            <p className="text-sm text-accent">
              {settingsError}
            </p>
          )}
        </section>
      )}

      {!canStart && (
        <p className="text-center text-sm text-white/40">
          {language === "hr"
            ? "Potrebna su najmanje 3 igrača."
            : "At least 3 players are required."}
        </p>
      )}

      <div className="mt-auto">
        {me.is_host ? (
          <>
            {startError && (
              <p className="mb-3 text-center text-sm text-accent">
                {startError}
              </p>
            )}

            <Button
              disabled={
                !canStart ||
                startLoading
              }
              onClick={
                handleStart
              }
            >
              {startLoading
                ? language ===
                  "hr"
                  ? "POKRETANJE..."
                  : "STARTING..."
                : canStart
                ? language ===
                  "hr"
                  ? "🤥 POKRENI LIAR"
                  : "🤥 START LIAR"
                : language ===
                  "hr"
                ? "ČEKAMO IGRAČE..."
                : "WAITING FOR PLAYERS..."}
            </Button>
          </>
        ) : (
          <p className="text-center text-white/40">
            {language === "hr"
              ? "Čekamo hosta..."
              : "Waiting for host..."}
          </p>
        )}
      </div>
    </main>
  );
}