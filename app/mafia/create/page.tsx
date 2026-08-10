"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import AvatarPicker from "@/components/AvatarPicker";
import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { createMafiaRoom } from "@/lib/mafia";

export default function CreateMafiaPage() {
  const router =
    useRouter();

  const {
    language,
    t,
  } = useLanguage();

  const [
    nickname,
    setNickname,
  ] = useState("");

  const [
    avatar,
    setAvatar,
  ] = useState("🐱");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  async function handleCreate() {
    const trimmed =
      nickname.trim();

    if (!trimmed) {
      setError(
        language === "hr"
          ? "Upiši nadimak."
          : "Enter a nickname."
      );

      return;
    }

    setLoading(true);
    setError(null);

    try {
      const code =
        await createMafiaRoom(
          trimmed,
          avatar
        );

      router.push(
        `/mafia/room/${code}`
      );
    } catch (e: any) {
      setError(
        e?.message ??
          "Could not create room."
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-7 p-6">
      <button
        type="button"
        onClick={() =>
          router.push("/mafia")
        }
        className="text-white/40 text-sm self-start"
      >
        ← {t("back")}
      </button>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          🎭 MAFIA
        </p>

        <h1 className="mt-2 text-3xl font-black">
          {language === "hr"
            ? "Kreiraj igru"
            : "Create game"}
        </h1>
      </div>

      <input
        className="input"
        value={nickname}
        maxLength={20}
        placeholder={t("nickname")}
        onChange={(e) =>
          setNickname(
            e.target.value
          )
        }
      />

      <AvatarPicker
        value={avatar}
        onChange={setAvatar}
        language={language}
      />

      {error && (
        <p className="text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-auto">
        <Button
          onClick={handleCreate}
          disabled={loading}
        >
          {loading
            ? language === "hr"
              ? "Kreiranje..."
              : "Creating..."
            : language === "hr"
            ? "KREIRAJ MAFIA SOBU"
            : "CREATE MAFIA ROOM"}
        </Button>
      </div>
    </main>
  );
}