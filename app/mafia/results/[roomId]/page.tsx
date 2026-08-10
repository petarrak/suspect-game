"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";

import {
  getMafiaFinalResults,
  getMafiaRoomById,
  getMyMafiaPlayerInRoom,
  rematchMafiaGame,
  type MafiaFinalResults,
  type MafiaPlayer,
  type MafiaRoom,
  type MafiaRole,
} from "@/lib/mafia";

const ROLE_LABELS: Record<
  MafiaRole,
  {
    emoji: string;
    hr: string;
    en: string;
  }
> = {
  MAFIA: {
    emoji: "🔪",
    hr: "Mafija",
    en: "Mafia",
  },
  DOCTOR: {
    emoji: "💉",
    hr: "Doktor",
    en: "Doctor",
  },
  DETECTIVE: {
    emoji: "🔎",
    hr: "Detektiv",
    en: "Detective",
  },
  CIVILIAN: {
    emoji: "🙂",
    hr: "Civil",
    en: "Civilian",
  },
};

export default function MafiaResultsPage() {
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

  const [results, setResults] =
    useState<MafiaFinalResults | null>(
      null
    );

  const [room, setRoom] =
    useState<MafiaRoom | null>(
      null
    );

  const [me, setMe] =
    useState<MafiaPlayer | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [rematching, setRematching] =
    useState(false);

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
          freshResults,
          freshRoom,
          freshMe,
        ] = await Promise.all([
          getMafiaFinalResults(
            roomId
          ),
          getMafiaRoomById(
            roomId
          ),
          getMyMafiaPlayerInRoom(
            roomId
          ),
        ]);

        if (cancelled) return;

        if (
          !freshRoom ||
          !freshMe
        ) {
          throw new Error(
            "Could not load final results."
          );
        }

        setResults(freshResults);
        setRoom(freshRoom);
        setMe(freshMe);
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              "Could not load final results."
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
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(
        `mafia-results-room-${roomId}`
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
            updated.status ===
            "waiting"
          ) {
            router.replace(
              `/mafia/room/${updated.code}`
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

  const mafiaPlayers =
    useMemo(
      () =>
        results?.players.filter(
          (p) =>
            p.role === "MAFIA"
        ) ?? [],
      [results]
    );

  async function handleRematch() {
    if (
      !roomId ||
      !me?.is_host ||
      rematching
    ) {
      return;
    }

    setRematching(true);
    setError(null);

    try {
      await rematchMafiaGame(
        roomId
      );

      if (room) {
        router.replace(
          `/mafia/room/${room.code}`
        );
      }
    } catch (e: any) {
      setError(
        e?.message ??
          "Could not start rematch."
      );

      setRematching(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-white/50">
          {language === "hr"
            ? "Učitavanje rezultata..."
            : "Loading results..."}
        </p>
      </main>
    );
  }

  if (
    error &&
    !results
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-accent">
          {error}
        </p>
      </main>
    );
  }

  if (
    !results ||
    !room ||
    !me
  ) {
    return null;
  }

  const mafiaWon =
    results.winner === "MAFIA";

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6 pb-8">
      <div className="text-center pt-7">
        <div className="text-7xl">
          {mafiaWon
            ? "🔪"
            : "🏘️"}
        </div>

        <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-accent">
          🎭 MAFIA
        </p>

        <h1 className="mt-2 text-4xl font-black">
          {mafiaWon
            ? language === "hr"
              ? "MAFIJA POBJEĐUJE"
              : "MAFIA WINS"
            : language === "hr"
            ? "CIVILI POBJEĐUJU"
            : "CIVILIANS WIN"}
        </h1>

        <p className="mt-3 text-white/40">
          {language === "hr"
            ? `Igra završena nakon ${results.day_number} dana.`
            : `Game ended after ${results.day_number} days.`}
        </p>
      </div>

      <section className="rounded-3xl border border-accent/25 bg-accent/10 p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
          {language === "hr"
            ? "MAFIJA JE BILA"
            : "THE MAFIA WAS"}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {mafiaPlayers.map(
            (player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <span className="text-2xl">
                  {player.avatar}
                </span>

                <span className="flex-1 font-black">
                  {player.nickname}
                </span>

                <span>
                  {player.is_alive
                    ? "😈"
                    : "💀"}
                </span>
              </div>
            )
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-black">
          👥{" "}
          {language === "hr"
            ? "SVE ULOGE"
            : "ALL ROLES"}
        </h2>

        <div className="mt-4 flex flex-col gap-2">
          {results.players.map(
            (player) => {
              const role =
                ROLE_LABELS[
                  player.role
                ];

              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  <span className="text-2xl">
                    {player.avatar}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {player.nickname}
                    </p>

                    <p className="text-xs text-white/35">
                      {role.emoji}{" "}
                      {language === "hr"
                        ? role.hr
                        : role.en}
                    </p>
                  </div>

                  <span>
                    {player.is_alive
                      ? "❤️"
                      : "💀"}
                  </span>
                </div>
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

      <div className="mt-auto flex flex-col gap-3">
        {me.is_host && (
          <Button
            onClick={handleRematch}
            disabled={rematching}
          >
            {rematching
              ? language === "hr"
                ? "POKRETANJE..."
                : "STARTING..."
              : language === "hr"
              ? "🔄 IGRAJ PONOVNO"
              : "🔄 REMATCH"}
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={() =>
            router.push("/")
          }
        >
          🏠 PARTY GAMES
        </Button>
      </div>
    </main>
  );
}