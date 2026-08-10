"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/Button";
import AvatarPicker from "@/components/AvatarPicker";

import { createRoom } from "@/lib/useRoom";
import { useLanguage } from "@/components/LanguageProvider";

export default function CreateGamePage() {
  const router = useRouter();

  const {
    language,
    t,
  } = useLanguage();

  const [nickname, setNickname] =
    useState("");

  const [avatar, setAvatar] =
    useState("🐱");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleCreate() {
    const trimmed =
      nickname.trim();

    if (!trimmed) {
      setError(
        t("enterNickname")
      );

      return;
    }

    if (trimmed.length > 20) {
      setError(
        t("nicknameTooLong")
      );

      return;
    }

    setLoading(true);
    setError(null);

    try {
      const code =
        await createRoom(
          trimmed,
          avatar
        );

      router.push(
        `/room/${code}`
      );
    } catch (e: any) {
      setError(
        e?.message ??
          t("roomCreateError")
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-7 p-6">
      <button
        type="button"
        onClick={() =>
          router.push("/")
        }
        className="text-white/40 text-sm self-start"
      >
        ← {t("back")}
      </button>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">
          {t("createTitle")}
        </h1>

        <p className="text-white/50">
          {t("createSubtitle")}
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
        autoFocus
      />

      <AvatarPicker
        value={avatar}
        onChange={setAvatar}
        language={language}
      />

      {error && (
        <p className="text-accent text-sm">
          {error}
        </p>
      )}

      <div className="mt-auto">
        <Button
          onClick={
            handleCreate
          }
          disabled={loading}
        >
          {loading
            ? t("creatingRoom")
            : t("createGame")}
        </Button>
      </div>
    </main>
  );
}