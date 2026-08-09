"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/Button";
import RoomCodeDisplay from "@/components/RoomCodeDisplay";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";
import { playSound } from "@/lib/sounds";
import QRCode from "react-qr-code";
import type { Intensity, QuestionPack } from "@/lib/types";
import {
  useRoomRealtime,
  joinRoom,
  startGame,
  getRememberedPlayerId,
} from "@/lib/useRoom";

const ROUND_OPTIONS = [3, 5, 7, 10];
const QUESTION_TIME_OPTIONS = [10, 20, 30, 45, 60];

const QUESTION_PACK_OPTIONS: {
  value: QuestionPack;
  emoji: string;
  hr: string;
  en: string;
}[] = [
  { value: "CLASSIC", emoji: "😊", hr: "Classic", en: "Classic" },
  { value: "PARTY", emoji: "🎉", hr: "Party", en: "Party" },
  { value: "GAMING", emoji: "🎮", hr: "Gaming", en: "Gaming" },
  { value: "COUPLES", emoji: "❤️", hr: "Parovi", en: "Couples" },
  { value: "ADULT", emoji: "🔞", hr: "18+", en: "18+" },
  { value: "DRINKING", emoji: "🍻", hr: "Drinking", en: "Drinking" },
  { value: "MOVIES", emoji: "🎬", hr: "Filmovi", en: "Movies" },
  { value: "MUSIC", emoji: "🎵", hr: "Glazba", en: "Music" },
  { value: "SPORTS", emoji: "⚽", hr: "Sport", en: "Sports" },
  { value: "GEOGRAPHY", emoji: "🌍", hr: "Geografija", en: "Geography" },
  { value: "MEMES", emoji: "😂", hr: "Memeovi", en: "Memes" },
  { value: "INTERNET", emoji: "📱", hr: "Internet", en: "Internet" },
  { value: "KIDS", emoji: "🧸", hr: "Djeca", en: "Kids" },
  { value: "FAMILY", emoji: "👨‍👩‍👧", hr: "Obitelj", en: "Family" },
  { value: "RANDOM", emoji: "🎲", hr: "Nasumično", en: "Random" },
];

const INTENSITY_OPTIONS: Intensity[] = [
  "FRIENDLY",
  "CHAOTIC",
  "SAVAGE",
];

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();

  const { language, t } = useLanguage();

  const code = (params.code as string).toUpperCase();

  const { room, players, loading, error } =
    useRoomRealtime(code);

  const meId = getRememberedPlayerId(code);

  const me =
    players.find((p) => p.id === meId) ?? null;

  const [nickname, setNickname] =
    useState("");

  const [joinLoading, setJoinLoading] =
    useState(false);

  const [joinError, setJoinError] =
    useState<string | null>(null);

  const [starting, setStarting] =
    useState(false);

  const [startError, setStartError] =
    useState<string | null>(null);

  const [settingsLoading, setSettingsLoading] =
    useState(false);

  const [settingsError, setSettingsError] =
    useState<string | null>(null);

  const [kickingId, setKickingId] =
    useState<string | null>(null);

  const previousPlayerCount = useRef(0);

  useEffect(() => {
    if (!room) return;

    if (room.status === "question") {
      router.push(`/question/${room.id}`);
    }

    if (room.status === "answering") {
      router.push(`/answer/${room.id}`);
    }

    if (room.status === "voting") {
      router.push(`/voting/${room.id}`);
    }

    if (room.status === "reveal") {
      router.push(`/reveal/${room.id}`);
    }
  }, [room, router]);

  useEffect(() => {
    if (loading) return;

    // First load: remember the current count without playing a sound.
    if (previousPlayerCount.current === 0) {
      previousPlayerCount.current = players.length;
      return;
    }

    // Play only when the player count increases.
    if (players.length > previousPlayerCount.current) {
      playSound("join");
    }

    previousPlayerCount.current = players.length;
  }, [players.length, loading]);

  async function handleInlineJoin() {
    const trimmed = nickname.trim();

    if (!trimmed) {
      setJoinError(
        language === "hr"
          ? "Prvo upiši nadimak."
          : "Enter a nickname first."
      );
      return;
    }

    setJoinLoading(true);
    setJoinError(null);

    try {
      await joinRoom(code, trimmed);
      window.location.reload();
    } catch (e: any) {
      setJoinError(
        e?.message ??
          (language === "hr"
            ? "Nije se moguće pridružiti sobi."
            : "Could not join the room.")
      );

      setJoinLoading(false);
    }
  }

  async function handleStart() {
    if (!room) return;

    setStarting(true);
    setStartError(null);

    try {
      playSound("start");

      await startGame(
        room,
        players
      );
    } catch (e: any) {
      setStartError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće pokrenuti igru."
            : "Could not start the game.")
      );

      setStarting(false);
    }
  }

  async function changeRounds(
    rounds: number
  ) {
    if (
      !room ||
      !me?.is_host ||
      settingsLoading
    ) {
      return;
    }

    playSound("click");

    setSettingsLoading(true);
    setSettingsError(null);

    try {
      const { error } =
        await supabase
          .from("rooms")
          .update({
            total_rounds: rounds,
          })
          .eq("id", room.id);

      if (error) {
        throw new Error(
          error.message
        );
      }
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće promijeniti broj rundi."
            : "Could not change the number of rounds.")
      );
    } finally {
      setSettingsLoading(false);
    }
  }

  async function changeQuestionTime(
    seconds: number
  ) {
    if (
      !room ||
      !me?.is_host ||
      settingsLoading
    ) {
      return;
    }

    playSound("click");
    setSettingsLoading(true);
    setSettingsError(null);

    try {
      const { error } =
        await supabase
          .from("rooms")
          .update({
            question_time: seconds,
          })
          .eq("id", room.id);

      if (error) {
        throw new Error(
          error.message
        );
      }
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće promijeniti vrijeme za pitanje."
            : "Could not change question time.")
      );
    } finally {
      setSettingsLoading(false);
    }
  }

  async function changeQuestionPack(
    questionPack: QuestionPack
  ) {
    if (
      !room ||
      !me?.is_host ||
      settingsLoading
    ) {
      return;
    }

    playSound("click");
    setSettingsLoading(true);
    setSettingsError(null);

    try {
      const { error } =
        await supabase
          .from("rooms")
          .update({
            question_pack: questionPack,
          })
          .eq("id", room.id);

      if (error) {
        throw new Error(
          error.message
        );
      }
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće promijeniti paket pitanja."
            : "Could not change the question pack.")
      );
    } finally {
      setSettingsLoading(false);
    }
  }

  async function changeIntensity(
    intensity: Intensity
  ) {
    if (
      !room ||
      !me?.is_host ||
      settingsLoading
    ) {
      return;
    }

    playSound("click");

    setSettingsLoading(true);
    setSettingsError(null);

    try {
      const { error } =
        await supabase
          .from("rooms")
          .update({
            intensity,
          })
          .eq("id", room.id);

      if (error) {
        throw new Error(
          error.message
        );
      }
    } catch (e: any) {
      setSettingsError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće promijeniti intenzitet."
            : "Could not change intensity.")
      );
    } finally {
      setSettingsLoading(false);
    }
  }

  async function handleKickPlayer(
    playerId: string
  ) {
    if (
      !room ||
      !me?.is_host ||
      playerId === me.id ||
      kickingId
    ) {
      return;
    }

    playSound("click");

    setKickingId(playerId);
    setSettingsError(null);

    try {
      const { error } =
        await supabase.rpc(
          "kick_player",
          {
            p_room_id: room.id,
            p_player_id: playerId,
          }
        );

      if (error) {
        throw new Error(
          error.message
        );
      }
    } catch (e: any) {
      console.error(
        "Kick player failed:",
        e
      );

      setSettingsError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće izbaciti igrača."
            : "Could not kick player.")
      );
    } finally {
      setKickingId(null);
    }
  }

  function intensityLabel(
    intensity: Intensity
  ) {
    if (
      intensity === "FRIENDLY"
    ) {
      return t("friendly");
    }

    if (
      intensity === "CHAOTIC"
    ) {
      return t("chaotic");
    }

    return t("savage");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/50">
          {language === "hr"
            ? "Učitavanje sobe..."
            : "Loading room..."}
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
      <main className="min-h-screen max-w-md mx-auto flex flex-col gap-8 p-6">

        <button
          type="button"
          onClick={() => {
            playSound("click");
            router.push("/");
          }}
          className="text-white/40 text-sm self-start"
        >
          ← {t("back")}
        </button>

        <div>
          <h1 className="text-3xl font-bold">
            {language === "hr"
              ? `Pridruži se sobi ${code}`
              : `Join room ${code}`}
          </h1>

          <p className="text-white/50 mt-2">
            {language === "hr"
              ? "Odaberi nadimak i uđi u lobby."
              : "Pick a nickname to hop into the lobby."}
          </p>
        </div>

        <input
          className="input"
          placeholder={t("nickname")}
          value={nickname}
          maxLength={20}
          onChange={(e) =>
            setNickname(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter"
            ) {
              handleInlineJoin();
            }
          }}
          autoFocus
        />

        {joinError && (
          <p className="text-accent text-sm">
            {joinError}
          </p>
        )}

        <Button
          onClick={
            handleInlineJoin
          }
          disabled={
            joinLoading
          }
        >
          {joinLoading
            ? language === "hr"
              ? "Pridruživanje..."
              : "Joining..."
            : t("joinGame")}
        </Button>

      </main>
    );
  }

  const canStart =
    players.length >= 3;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">

      <div className="text-center pt-4">
        <h1 className="text-3xl font-black">
          SUSPECT 🕵️
        </h1>
      </div>

      <RoomCodeDisplay
        code={room.code}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-lg">
          <QRCode
            value={`${window.location.origin}/join?code=${room.code}`}
            size={170}
          />
        </div>

        <p className="text-white/40 text-sm">
          📱 {language === "hr"
            ? "Skeniraj za pridruživanje"
            : "Scan to join"}
        </p>
      </div>

      <div className="flex flex-col gap-3">

        <span className="text-xs uppercase tracking-widest text-white/40">
          {t("players")} (
          {players.length}/12)
        </span>

        <div className="flex flex-col gap-3">

          {players.map(
            (player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-2xl bg-panel2 border border-white/10 px-4 py-4"
              >

                <div className="text-3xl">
                  {player.avatar ||
                    "🙂"}
                </div>

                <div className="flex-1 min-w-0">

                  <div className="flex items-center gap-2">

                    <span className="font-semibold truncate">
                      {
                        player.nickname
                      }

                      {player.id ===
                        meId && (
                        <span className="text-white/40">
                          {" "}
                          {language ===
                          "hr"
                            ? "(ti)"
                            : "(you)"}
                        </span>
                      )}
                    </span>

                    {player.is_host && (
                      <span className="rounded-full bg-yellow-500/20 text-yellow-300 px-2 py-1 text-[10px] font-bold">
                        {t("host")}
                      </span>
                    )}

                  </div>

                  <div className="flex items-center gap-2 mt-1">

                    <span
                      className={`h-2 w-2 rounded-full ${
                        player.is_connected
                          ? "bg-green-400"
                          : "bg-white/20"
                      }`}
                    />

                    <span className="text-xs text-white/30">
                      {player.is_connected
                        ? "Online"
                        : "Offline"}
                    </span>

                  </div>

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
                        handleKickPlayer(
                          player.id
                        )
                      }
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 disabled:opacity-40"
                    >
                      {kickingId ===
                      player.id
                        ? "..."
                        : `👢 ${t(
                            "kick"
                          )}`}
                    </button>
                  )}

              </div>
            )
          )}

        </div>

      </div>

      {me.is_host && (
        <section className="card p-5 flex flex-col gap-6">

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent mb-1">
              HOST
            </p>

            <h2 className="text-xl font-black">
              {language === "hr"
                ? "Postavke igre"
                : "Game Settings"}
            </h2>
          </div>

          <div className="flex flex-col gap-3">

            <div className="flex items-center justify-between">

              <span className="text-sm font-bold">
                {t("rounds")}
              </span>

              <span className="text-sm text-accent font-black">
                {room.total_rounds}
              </span>

            </div>

            <div className="grid grid-cols-4 gap-2">

              {ROUND_OPTIONS.map(
                (rounds) => {
                  const active =
                    room.total_rounds ===
                    rounds;

                  return (
                    <button
                      key={rounds}
                      type="button"
                      disabled={
                        settingsLoading
                      }
                      onClick={() =>
                        changeRounds(
                          rounds
                        )
                      }
                      className={`rounded-xl border py-3 font-black transition ${
                        active
                          ? "border-accent bg-accent/20 text-white"
                          : "border-white/10 bg-black/20 text-white/50"
                      }`}
                    >
                      {rounds}
                    </button>
                  );
                }
              )}

            </div>

          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                {language === "hr"
                  ? "VRIJEME ZA PITANJE"
                  : "QUESTION TIME"}
              </span>

              <span className="text-sm text-accent font-black">
                {room.question_time ?? 20}s
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {QUESTION_TIME_OPTIONS.map(
                (seconds) => {
                  const active =
                    (room.question_time ?? 20) ===
                    seconds;

                  return (
                    <button
                      key={seconds}
                      type="button"
                      disabled={
                        settingsLoading
                      }
                      onClick={() =>
                        changeQuestionTime(
                          seconds
                        )
                      }
                      className={`rounded-xl border py-3 text-xs font-black transition ${
                        active
                          ? "border-accent bg-accent/20 text-white"
                          : "border-white/10 bg-black/20 text-white/50"
                      }`}
                    >
                      {seconds}s
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                {language === "hr"
                  ? "PAKET PITANJA"
                  : "QUESTION PACK"}
              </span>

              <span className="text-xs text-accent font-black">
                {QUESTION_PACK_OPTIONS.find(
                  (option) =>
                    option.value ===
                    (room.question_pack ?? "CLASSIC")
                )?.emoji}{" "}
                {QUESTION_PACK_OPTIONS.find(
                  (option) =>
                    option.value ===
                    (room.question_pack ?? "CLASSIC")
                )?.[
                  language === "hr"
                    ? "hr"
                    : "en"
                ]}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {QUESTION_PACK_OPTIONS.map(
                (option) => {
                  const active =
                    (room.question_pack ?? "CLASSIC") ===
                    option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={
                        settingsLoading
                      }
                      onClick={() =>
                        changeQuestionPack(
                          option.value
                        )
                      }
                      className={`rounded-xl border px-2 py-3 text-xs font-black transition ${
                        active
                          ? "border-accent bg-accent/20 text-white"
                          : "border-white/10 bg-black/20 text-white/50"
                      }`}
                    >
                      <span className="block text-lg mb-1">
                        {option.emoji}
                      </span>

                      {language === "hr"
                        ? option.hr
                        : option.en}
                    </button>
                  );
                }
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-white/30">
              {language === "hr"
                ? "Nasumično miješa sve pakete. Novi paketi trebaju imati pitanja u bazi prije igranja."
                : "Random mixes every pack. New packs need questions in the database before playing."}
            </p>
          </div>

          <div className="flex flex-col gap-3">

            <span className="text-sm font-bold">
              {t("intensity")}
            </span>

            <div className="grid grid-cols-3 gap-2">

              {INTENSITY_OPTIONS.map(
                (intensity) => {
                  const active =
                    room.intensity ===
                    intensity;

                  return (
                    <button
                      key={intensity}
                      type="button"
                      disabled={
                        settingsLoading
                      }
                      onClick={() =>
                        changeIntensity(
                          intensity
                        )
                      }
                      className={`rounded-xl border px-2 py-3 text-xs font-black transition ${
                        active
                          ? "border-accent bg-accent/20 text-white"
                          : "border-white/10 bg-black/20 text-white/50"
                      }`}
                    >
                      {intensity ===
                      "FRIENDLY"
                        ? "😊 "
                        : intensity ===
                          "CHAOTIC"
                        ? "🔥 "
                        : "😈 "}

                      {intensityLabel(
                        intensity
                      )}
                    </button>
                  );
                }
              )}

            </div>

          </div>

          {settingsError && (
            <p className="text-accent text-sm text-center">
              {settingsError}
            </p>
          )}

        </section>
      )}

      {!canStart && (
        <p className="text-center text-white/40 text-sm">
          {language === "hr"
            ? "Potrebna su najmanje 3 igrača za početak."
            : "Need at least 3 players to start."}
        </p>
      )}

      {startError && (
        <p className="text-center text-accent text-sm">
          {startError}
        </p>
      )}

      <div className="mt-auto">

        {me.is_host ? (
          <Button
            onClick={handleStart}
            disabled={
              !canStart ||
              starting ||
              settingsLoading
            }
          >
            {starting
              ? language === "hr"
                ? "Pokretanje..."
                : "Starting..."
              : `🚀 ${t(
                  "startGame"
                )}`}
          </Button>
        ) : (
          <p className="text-center text-white/40">
            {language === "hr"
              ? "Čekamo hosta da pokrene igru..."
              : "Waiting for the host to start the game..."}
          </p>
        )}

      </div>

    </main>
  );
}