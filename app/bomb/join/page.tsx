"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import { motion } from "motion/react";

import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";

import {
  joinBombRoom,
} from "@/lib/bomb";

const AVATARS = [
  "😎",
  "🤠",
  "🥷",
  "🤓",
  "😈",
  "👻",
  "🤖",
  "🦀",
];

export default function BombJoinPage() {
  const router =
    useRouter();

  const { language } =
    useLanguage();

  const [
    code,
    setCode,
  ] = useState("");

  const [
    nickname,
    setNickname,
  ] = useState("");

  const [
    avatar,
    setAvatar,
  ] = useState(
    AVATARS[0]
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const queryCode =
      params.get("code");

    if (queryCode) {
      setCode(
        queryCode
          .toUpperCase()
          .replace(
            /[^A-Z0-9]/g,
            ""
          )
          .slice(0, 6)
      );
    }
  }, []);

  async function handleJoin() {
    const cleanCode =
      code
        .trim()
        .toUpperCase();

    const cleanNickname =
      nickname.trim();

    if (
      !cleanCode ||
      !cleanNickname ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const roomCode =
        await joinBombRoom(
          cleanCode,
          cleanNickname,
          avatar
        );

      router.push(
        `/bomb/room/${roomCode}`
      );
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće ući u sobu."
            : "Could not join room.")
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <motion.div
        className="text-center pt-8"
        initial={{
          opacity: 0,
          y: -15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <div className="text-6xl">
          💣
        </div>

        <p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-accent">
          BOMB
        </p>

        <h1 className="mt-2 text-3xl font-black">
          {language === "hr"
            ? "PRIDRUŽI SE"
            : "JOIN ROOM"}
        </h1>
      </motion.div>

      <section className="card p-5">
        <label className="text-xs font-black uppercase tracking-widest text-white/35">
          {language === "hr"
            ? "KOD SOBE"
            : "ROOM CODE"}
        </label>

        <input
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
                .toUpperCase()
                .replace(
                  /[^A-Z0-9]/g,
                  ""
                )
            )
          }
          maxLength={6}
          placeholder="ABC123"
          className="input mt-3 text-center font-black uppercase tracking-[0.25em]"
        />

        <label className="mt-6 block text-xs font-black uppercase tracking-widest text-white/35">
          {language === "hr"
            ? "NADIMAK"
            : "NICKNAME"}
        </label>

        <input
          value={nickname}
          onChange={(e) =>
            setNickname(
              e.target.value
            )
          }
          maxLength={20}
          placeholder={
            language === "hr"
              ? "Tvoje ime..."
              : "Your name..."
          }
          className="input mt-3"
        />

        <p className="mt-6 text-xs font-black uppercase tracking-widest text-white/35">
          AVATAR
        </p>

        <div className="mt-3 grid grid-cols-4 gap-3">
          {AVATARS.map(
            (item) => {
              const selected =
                avatar === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setAvatar(
                      item
                    )
                  }
                  className={`flex aspect-square items-center justify-center rounded-2xl border text-3xl transition active:scale-95 ${
                    selected
                      ? "border-accent bg-accent/20"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  {item}
                </button>
              );
            }
          )}
        </div>
      </section>

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-auto pb-4">
        <Button
          onClick={
            handleJoin
          }
          disabled={
            loading ||
            !code.trim() ||
            !nickname.trim()
          }
        >
          {loading
            ? language === "hr"
              ? "ULAZAK..."
              : "JOINING..."
            : language === "hr"
            ? "🚪 UĐI U SOBU"
            : "🚪 JOIN ROOM"}
        </Button>
      </div>
    </main>
  );
}