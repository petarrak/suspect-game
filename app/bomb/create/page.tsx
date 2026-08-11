"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import { motion } from "motion/react";

import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";

import {
  createBombRoom,
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

export default function BombCreatePage() {
  const router =
    useRouter();

  const { language } =
    useLanguage();

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

  async function handleCreate() {
    const cleanNickname =
      nickname.trim();

    if (
      !cleanNickname ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const code =
        await createBombRoom(
          cleanNickname,
          avatar
        );

      router.push(
        `/bomb/room/${code}`
      );
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće napraviti sobu."
            : "Could not create room.")
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
            ? "NAPRAVI SOBU"
            : "CREATE ROOM"}
        </h1>
      </motion.div>

      <section className="card p-5">
        <label className="text-xs font-black uppercase tracking-widest text-white/35">
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
          {language === "hr"
            ? "AVATAR"
            : "AVATAR"}
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
            handleCreate
          }
          disabled={
            loading ||
            !nickname.trim()
          }
        >
          {loading
            ? language === "hr"
              ? "KREIRANJE..."
              : "CREATING..."
            : language === "hr"
            ? "💣 NAPRAVI SOBU"
            : "💣 CREATE ROOM"}
        </Button>
      </div>
    </main>
  );
}