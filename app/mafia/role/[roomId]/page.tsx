"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { motion } from "motion/react";

import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";

import {
  getMafiaRoomById,
  getMyMafiaRole,
  markMyMafiaRoleReady,
  type MafiaRoom,
  type MyMafiaRole,
} from "@/lib/mafia";

const ROLE_INFO = {
  MAFIA: {
    emoji: "🔪",
    titleHr: "MAFIJA",
    titleEn: "MAFIA",
    hr: "Noću birate metu. Danju glumite civila i pokušajte izbjeći sumnju.",
    en: "Choose a target at night. During the day, blend in and avoid suspicion.",
  },
  DOCTOR: {
    emoji: "💉",
    titleHr: "DOKTOR",
    titleEn: "DOCTOR",
    hr: "Svake noći možete pokušati spasiti jednog igrača od Mafije.",
    en: "Each night you can try to save one player from the Mafia.",
  },
  DETECTIVE: {
    emoji: "🔎",
    titleHr: "DETEKTIV",
    titleEn: "DETECTIVE",
    hr: "Svake noći istražite jednog igrača i saznajte pripada li Mafiji.",
    en: "Each night investigate one player and learn whether they are Mafia.",
  },
  CIVILIAN: {
    emoji: "🙂",
    titleHr: "CIVIL",
    titleEn: "CIVILIAN",
    hr: "Nemate noćnu moć. Slušajte, raspravljajte i pronađite Mafiju.",
    en: "You have no night power. Listen, discuss, and find the Mafia.",
  },
} as const;

export default function MafiaRolePage() {
  const params = useParams();
  const router = useRouter();
  const { language } =
    useLanguage();

  const rawRoomId =
    params.roomId;

  const roomId =
    Array.isArray(rawRoomId)
      ? rawRoomId[0]
      : rawRoomId;

  const [room, setRoom] =
    useState<MafiaRoom | null>(
      null
    );

  const [myRole, setMyRole] =
    useState<MyMafiaRole | null>(
      null
    );

  const [revealed, setRevealed] =
    useState(false);

  const [ready, setReady] =
    useState(false);

  const [readyLoading, setReadyLoading] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    async function load() {
      try {
        const [
          freshRoom,
          freshRole,
        ] = await Promise.all([
          getMafiaRoomById(
            roomId
          ),
          getMyMafiaRole(
            roomId
          ),
        ]);

        if (cancelled) return;

        if (!freshRoom) {
          throw new Error(
            language === "hr"
              ? "Soba ne postoji."
              : "Room not found."
          );
        }

        setRoom(freshRoom);
        setMyRole(freshRole);

        if (
          freshRoom.status === "night"
        ) {
          router.replace(
            `/mafia/night/${roomId}`
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati ulogu."
                : "Could not load role.")
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    roomId,
    language,
    router,
  ]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(
        `mafia-role-room-${roomId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mafia_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated =
            payload.new as MafiaRoom;

          setRoom(updated);

          if (
            updated.status === "night"
          ) {
            router.replace(
              `/mafia/night/${roomId}`
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [
    roomId,
    router,
  ]);

  async function handleReady() {
    if (
      !roomId ||
      ready ||
      readyLoading
    ) {
      return;
    }

    setReadyLoading(true);
    setError(null);

    try {
      await markMyMafiaRoleReady(
        roomId
      );

      setReady(true);
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće potvrditi spremnost."
            : "Could not confirm readiness.")
      );

      setReadyLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-white/50">
          {language === "hr"
            ? "Dodjeljujemo tajnu ulogu..."
            : "Assigning your secret role..."}
        </p>
      </main>
    );
  }

  if (
    error &&
    !myRole
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-accent">
          {error}
        </p>
      </main>
    );
  }

  if (!myRole) {
    return null;
  }

  const info =
    ROLE_INFO[myRole.role];

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <div className="text-center pt-5">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          🎭 MAFIA
        </p>

        <h1 className="mt-2 text-3xl font-black">
          {language === "hr"
            ? "TVOJA ULOGA"
            : "YOUR ROLE"}
        </h1>

        <p className="mt-2 text-sm text-white/40">
          {myRole.avatar}{" "}
          {myRole.nickname}
        </p>
      </div>

      {!revealed ? (
        <motion.section
          className="mt-auto mb-auto rounded-3xl border border-white/10 bg-panel2 p-8 text-center"
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          <div className="text-7xl">
            🂠
          </div>

          <h2 className="mt-5 text-2xl font-black">
            {language === "hr"
              ? "ULOGA JE TAJNA"
              : "YOUR ROLE IS SECRET"}
          </h2>

          <p className="mt-3 text-white/45">
            {language === "hr"
              ? "Pobrini se da nitko drugi ne vidi ekran."
              : "Make sure nobody else can see your screen."}
          </p>

          <button
            type="button"
            onClick={() =>
              setRevealed(true)
            }
            className="mt-7 w-full rounded-2xl bg-accent px-6 py-4 font-black text-white shadow-lg shadow-accent/25 active:scale-[0.98]"
          >
            👁️{" "}
            {language === "hr"
              ? "OTKRIJ ULOGU"
              : "REVEAL ROLE"}
          </button>
        </motion.section>
      ) : (
        <motion.section
          className="mt-auto mb-auto rounded-3xl border border-accent/30 bg-accent/10 p-8 text-center shadow-2xl shadow-accent/10"
          initial={{
            opacity: 0,
            scale: 0.9,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
        >
          <div className="text-7xl">
            {info.emoji}
          </div>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-white/35">
            {language === "hr"
              ? "TI SI"
              : "YOU ARE"}
          </p>

          <h2 className="mt-2 text-4xl font-black">
            {language === "hr"
              ? info.titleHr
              : info.titleEn}
          </h2>

          <p className="mt-5 leading-relaxed text-white/55">
            {language === "hr"
              ? info.hr
              : info.en}
          </p>
        </motion.section>
      )}

      {revealed && (
        <div className="pb-4">
          {error && (
            <p className="mb-3 text-center text-sm text-accent">
              {error}
            </p>
          )}

          {ready ? (
            <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-4 text-center">
              <p className="font-black text-green-300">
                ✅{" "}
                {language === "hr"
                  ? "SPREMAN"
                  : "READY"}
              </p>

              <p className="mt-2 text-sm text-white/45">
                {language === "hr"
                  ? "Čekamo ostale igrače. Noć počinje kad su svi spremni."
                  : "Waiting for the others. Night begins when everyone is ready."}
              </p>
            </div>
          ) : (
            <button
              type="button"
              disabled={readyLoading}
              onClick={handleReady}
              className="w-full rounded-2xl bg-accent px-6 py-4 font-black text-white shadow-lg shadow-accent/25 active:scale-[0.98] disabled:opacity-50"
            >
              {readyLoading
                ? language === "hr"
                  ? "POTVRĐIVANJE..."
                  : "CONFIRMING..."
                : language === "hr"
                ? "✅ SPREMAN SAM"
                : "✅ I'M READY"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}