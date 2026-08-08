"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { joinRoom } from "@/lib/useRoom";
import { useLanguage } from "@/components/LanguageProvider";

export default function JoinGamePage() {
  const router = useRouter();
  const { language, t } = useLanguage();

  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    const trimmedCode = code.trim();
    const trimmedName = nickname.trim();

    if (!trimmedCode || trimmedCode.length < 6) {
      setError(
        language === "hr"
          ? "Upiši cijeli kod sobe od 6 znakova."
          : "Enter the full 6-character room code."
      );
      return;
    }

    if (!trimmedName) {
      setError(
        language === "hr"
          ? "Prvo upiši nadimak."
          : "Enter a nickname first."
      );
      return;
    }

    if (trimmedName.length > 20) {
      setError(
        language === "hr"
          ? "Nadimak može imati najviše 20 znakova."
          : "Keep your nickname under 20 characters."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const joinedCode = await joinRoom(
        trimmedCode,
        trimmedName
      );

      router.push(`/room/${joinedCode}`);
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Došlo je do greške pri ulasku u sobu."
            : "Something went wrong joining the room.")
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-8 p-6">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="text-white/40 text-sm self-start"
      >
        ← {t("back")}
      </button>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">
          {language === "hr"
            ? "Pridruži se igri"
            : "Join a game"}
        </h1>

        <p className="text-white/50">
          {language === "hr"
            ? "Zatraži kod sobe od hosta."
            : "Ask the host for the room code."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <input
          className="input text-center tracking-[0.3em] uppercase"
          placeholder={t("roomCode")}
          value={code}
          maxLength={6}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase())
          }
          autoFocus
        />

        <input
          className="input"
          placeholder={t("nickname")}
          value={nickname}
          maxLength={20}
          onChange={(e) =>
            setNickname(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleJoin();
            }
          }}
        />
      </div>

      {error && (
        <p className="text-accent text-sm">
          {error}
        </p>
      )}

      <div className="mt-auto">
        <Button
          onClick={handleJoin}
          disabled={loading}
        >
          {loading
            ? language === "hr"
              ? "Pridruživanje..."
              : "Joining..."
            : t("joinGame")}
        </Button>
      </div>
    </main>
  );
}