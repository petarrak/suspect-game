"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import Button from "@/components/Button";
import AvatarPicker from "@/components/AvatarPicker";

import { joinRoom } from "@/lib/useRoom";
import { useLanguage } from "@/components/LanguageProvider";

export default function JoinGamePage() {
  const router = useRouter();

  const {
    language,
    t,
  } = useLanguage();

  const [code, setCode] =
    useState("");

  const [nickname, setNickname] =
    useState("");

  const [avatar, setAvatar] =
    useState("🐱");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const nicknameRef =
    useRef<HTMLInputElement | null>(
      null
    );

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const qrCode =
      params.get("code");

    if (!qrCode) return;

    const cleanedCode =
      qrCode
        .trim()
        .toUpperCase()
        .slice(0, 6);

    setCode(cleanedCode);

    if (
      cleanedCode.length === 6
    ) {
      window.setTimeout(() => {
        nicknameRef.current?.focus();
      }, 100);
    }
  }, []);

  async function handleJoin() {
    const trimmedCode =
      code
        .trim()
        .toUpperCase();

    const trimmedName =
      nickname.trim();

    if (
      !trimmedCode ||
      trimmedCode.length < 6
    ) {
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

    if (
      trimmedName.length > 20
    ) {
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
      const joinedCode =
        await joinRoom(
          trimmedCode,
          trimmedName,
          avatar
        );

      router.push(
        `/room/${joinedCode}`
      );
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
          {language === "hr"
            ? "Pridruži se igri"
            : "Join a game"}
        </h1>

        <p className="text-white/50">
          {code.length === 6
            ? language === "hr"
              ? "Kod sobe je učitan. Upiši nadimak i odaberi avatar."
              : "Room code loaded. Enter your nickname and choose an avatar."
            : language === "hr"
            ? "Zatraži kod sobe od hosta ili skeniraj QR kod."
            : "Ask the host for the room code or scan the QR code."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <input
            className="input text-center tracking-[0.3em] uppercase"
            placeholder={
              t("roomCode")
            }
            value={code}
            maxLength={6}
            onChange={(e) =>
              setCode(
                e.target.value.toUpperCase()
              )
            }
          />

          {code.length === 6 && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 font-bold">
              ✓
            </span>
          )}
        </div>

        <input
          ref={nicknameRef}
          className="input"
          placeholder={
            t("nickname")
          }
          value={nickname}
          maxLength={20}
          onChange={(e) =>
            setNickname(
              e.target.value
            )
          }
        />
      </div>

      <AvatarPicker
        value={avatar}
        onChange={setAvatar}
        language={language}
      />

      {code.length === 6 && (
        <p className="text-green-400 text-sm text-center">
          ✓{" "}
          {language === "hr"
            ? `Soba ${code} spremna`
            : `Room ${code} ready`}
        </p>
      )}

      {error && (
        <p className="text-accent text-sm">
          {error}
        </p>
      )}

      <div className="mt-auto">
        <Button
          onClick={
            handleJoin
          }
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