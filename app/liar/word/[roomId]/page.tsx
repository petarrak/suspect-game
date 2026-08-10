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

import Button from "@/components/Button";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import {
  getLiarRoomById,
  getMyLiarAssignment,
  getMyLiarPlayerInRoom,
  markMyLiarRoleReady,
  type LiarAssignment,
  type LiarPlayer,
  type LiarRoom,
} from "@/lib/liar";

export default function LiarWordPage() {
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
    useState<LiarRoom | null>(
      null
    );

  const [me, setMe] =
    useState<LiarPlayer | null>(
      null
    );

  const [
    assignment,
    setAssignment,
  ] = useState<LiarAssignment | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [revealed, setRevealed] =
    useState(false);

  const [ready, setReady] =
    useState(false);

  const [readyLoading, setReadyLoading] =
    useState(false);

  const [readyError, setReadyError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setError(
        language === "hr"
          ? "Nedostaje ID sobe."
          : "Missing room ID."
      );

      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [
          freshRoom,
          freshMe,
          freshAssignment,
        ] = await Promise.all([
          getLiarRoomById(roomId),
          getMyLiarPlayerInRoom(
            roomId
          ),
          getMyLiarAssignment(
            roomId
          ),
        ]);

        if (cancelled) {
          return;
        }

        if (!freshRoom) {
          throw new Error(
            language === "hr"
              ? "Soba ne postoji."
              : "Room not found."
          );
        }

        if (!freshMe) {
          throw new Error(
            language === "hr"
              ? "Nisi dio ove sobe."
              : "You're not part of this room."
          );
        }

        setRoom(freshRoom);
        setMe(freshMe);
        setAssignment(
          freshAssignment
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati ulogu."
                : "Could not load your role.")
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
  ]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(
        `liar-word-room-${roomId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "liar_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated =
            payload.new as LiarRoom;

          setRoom(updated);

          if (
            updated.status ===
            "discussion"
          ) {
            router.replace(
              `/liar/discussion/${roomId}`
            );
          }

          if (
            updated.status ===
            "voting"
          ) {
            router.replace(
              `/liar/voting/${roomId}`
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
    setReadyError(null);

    try {
      await markMyLiarRoleReady(
        roomId
      );

      setReady(true);
    } catch (e: any) {
      setReadyError(
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
            ? "Pripremamo tvoju ulogu..."
            : "Preparing your role..."}
        </p>
      </main>
    );
  }

  if (
    error ||
    !room ||
    !me ||
    !assignment
  ) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-5xl">
          🤥
        </div>

        <p className="text-accent">
          {error ??
            (language === "hr"
              ? "Uloga nije dostupna."
              : "Role unavailable.")}
        </p>

        <Button
          variant="secondary"
          onClick={() =>
            router.push("/liar")
          }
        >
          {language === "hr"
            ? "NATRAG"
            : "BACK"}
        </Button>
      </main>
    );
  }

  const secretWord =
    language === "hr"
      ? assignment.word_hr
      : assignment.word_en;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <div className="text-center pt-4">
        <p className="text-xs uppercase tracking-[0.25em] text-white/35">
          {language === "hr"
            ? "RUNDA"
            : "ROUND"}{" "}
          {assignment.round_number}
          {" / "}
          {assignment.total_rounds}
        </p>

        <h1 className="mt-2 text-3xl font-black">
          🤥 LIAR
        </h1>

        <p className="mt-2 text-sm text-white/40">
          {me.avatar}{" "}
          {me.nickname}
        </p>
      </div>

      {!revealed ? (
        <motion.section
          className="mt-auto mb-auto rounded-3xl border border-white/10 bg-panel2 p-7 text-center shadow-xl"
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          <div className="text-6xl">
            🂠
          </div>

          <h2 className="mt-5 text-2xl font-black">
            {language === "hr"
              ? "TVOJA KARTA JE TAJNA"
              : "YOUR CARD IS SECRET"}
          </h2>

          <p className="mt-3 text-white/45">
            {language === "hr"
              ? "Pobrini se da nitko drugi ne gleda ekran."
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
              ? "OTKRIJ MOJU KARTU"
              : "REVEAL MY CARD"}
          </button>
        </motion.section>
      ) : assignment.is_liar ? (
        <motion.section
          className="mt-auto mb-auto rounded-3xl border border-accent/40 bg-accent/10 p-8 text-center shadow-2xl shadow-accent/15"
          initial={{
            opacity: 0,
            scale: 0.88,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
        >
          <motion.div
            className="text-7xl"
            initial={{
              scale: 0.6,
            }}
            animate={{
              scale: 1,
            }}
          >
            🤥
          </motion.div>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-accent">
            {language === "hr"
              ? "TVOJA ULOGA"
              : "YOUR ROLE"}
          </p>

          <h2 className="mt-2 text-4xl font-black">
            {language === "hr"
              ? "TI SI LIAR"
              : "YOU ARE THE LIAR"}
          </h2>

          <p className="mt-5 leading-relaxed text-white/55">
            {language === "hr"
              ? "Ne znaš tajnu riječ. Slušaj hintove drugih igrača i pokušaj se uklopiti bez da te otkriju."
              : "You don't know the secret word. Listen to everyone else's clues and try to blend in without getting caught."}
          </p>
        </motion.section>
      ) : (
        <motion.section
          className="mt-auto mb-auto rounded-3xl border border-green-400/30 bg-green-400/10 p-8 text-center shadow-2xl"
          initial={{
            opacity: 0,
            scale: 0.88,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
        >
          <div className="text-6xl">
            🔐
          </div>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-green-300">
            {language === "hr"
              ? "TAJNA RIJEČ"
              : "SECRET WORD"}
          </p>

          <h2 className="mt-3 break-words text-4xl font-black">
            {secretWord}
          </h2>

          <p className="mt-5 leading-relaxed text-white/55">
            {language === "hr"
              ? "Zapamti riječ. Kad krene rasprava, daj dobar hint bez da izgovoriš samu riječ."
              : "Remember the word. During discussion, give a useful clue without saying the word itself."}
          </p>
        </motion.section>
      )}

      {revealed && (
        <div className="pb-4 text-center">
          <p className="text-sm text-white/35">
            {language === "hr"
              ? "Ne pokazuj ovaj ekran drugim igračima."
              : "Do not show this screen to other players."}
          </p>

          {readyError && (
            <p className="mt-4 text-sm text-accent">
              {readyError}
            </p>
          )}

          {ready ? (
            <div className="mt-4 rounded-2xl border border-green-400/20 bg-green-400/10 p-4">
              <p className="font-black text-green-300">
                ✅{" "}
                {language === "hr"
                  ? "SPREMAN"
                  : "READY"}
              </p>

              <p className="mt-2 text-sm text-white/45">
                {language === "hr"
                  ? "Čekamo ostale igrače. Rasprava počinje kad su svi spremni."
                  : "Waiting for the others. Discussion starts when everyone is ready."}
              </p>
            </div>
          ) : (
            <button
              type="button"
              disabled={readyLoading}
              onClick={handleReady}
              className="mt-4 w-full rounded-2xl bg-accent px-6 py-4 font-black text-white shadow-lg shadow-accent/25 active:scale-[0.98] disabled:opacity-50"
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