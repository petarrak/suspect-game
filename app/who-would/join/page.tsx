"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import AvatarPicker from "@/components/AvatarPicker";
import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { joinWhoWouldRoom } from "@/lib/whoWould";

export default function JoinWhoWouldPage() {
  const router =
    useRouter();

  const {
    language,
    t,
  } = useLanguage();

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

    if (!qrCode) {
      return;
    }

    const cleaned =
      qrCode
        .trim()
        .toUpperCase()
        .slice(0, 6);

    setCode(cleaned);

    if (
      cleaned.length === 6
    ) {
      window.setTimeout(
        () =>
          nicknameRef.current?.focus(),
        100
      );
    }
  }, []);

  async function handleJoin() {
    const cleanedCode =
      code
        .trim()
        .toUpperCase();

    const trimmed =
      nickname.trim();

    if (
      cleanedCode.length !== 6
    ) {
      setError(
        language === "hr"
          ? "Upiši kod sobe od 6 znakova."
          : "Enter the 6-character room code."
      );

      return;
    }

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
      const joinedCode =
        await joinWhoWouldRoom(
          cleanedCode,
          trimmed,
          avatar
        );

      router.push(
        `/who-would/room/${joinedCode}`
      );
    } catch (e: any) {
      setError(
        e?.message ??
          "Could not join room."
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <button
        type="button"
        onClick={() =>
          router.push(
            "/who-would"
          )
        }
        className="text-white/40 text-sm self-start"
      >
        ← {t("back")}
      </button>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          😂 WHO WOULD?
        </p>

        <h1 className="mt-2 text-3xl font-black">
          {language === "hr"
            ? "Pridruži se"
            : "Join game"}
        </h1>
      </div>

      <input
        className="input text-center uppercase tracking-[0.3em]"
        value={code}
        maxLength={6}
        placeholder={t("roomCode")}
        onChange={(e) =>
          setCode(
            e.target.value.toUpperCase()
          )
        }
      />

      <input
        ref={nicknameRef}
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