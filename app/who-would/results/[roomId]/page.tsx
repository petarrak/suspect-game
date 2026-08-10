"use client";

import {
  useEffect,
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
  getMyWhoWouldPlayerInRoom,
  getWhoWouldFinalResults,
  getWhoWouldRoomById,
  rematchWhoWouldGame,
  type WhoWouldFinalResults,
  type WhoWouldPlayer,
  type WhoWouldRoom,
} from "@/lib/whoWould";

export default function WhoWouldResultsPage() {
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
    useState<WhoWouldFinalResults | null>(
      null
    );

  const [room, setRoom] =
    useState<WhoWouldRoom | null>(
      null
    );

  const [me, setMe] =
    useState<WhoWouldPlayer | null>(
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
          getWhoWouldFinalResults(
            roomId
          ),
          getWhoWouldRoomById(
            roomId
          ),
          getMyWhoWouldPlayerInRoom(
            roomId
          ),
        ]);

        if (cancelled) return;

        if (
          !freshRoom ||
          !freshMe
        ) {
          throw new Error(
            "Could not load results."
          );
        }

        setResults(
          freshResults
        );
        setRoom(
          freshRoom
        );
        setMe(
          freshMe
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              "Could not load results."
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
        `who-would-results-${roomId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "who_would_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated =
            payload.new as WhoWouldRoom;

          setRoom(updated);

          if (
            updated.status === "waiting"
          ) {
            router.replace(
              `/who-would/room/${updated.code}`
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
      await rematchWhoWouldGame(
        roomId
      );

      if (room) {
        router.replace(
          `/who-would/room/${room.code}`
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

  const topScore =
    results.players[0]?.score ?? 0;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6 pb-8">
      <div className="text-center pt-7">
        <div className="text-7xl">
          🏆
        </div>

        <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-accent">
          😂 WHO WOULD?
        </p>

        <h1 className="mt-2 text-4xl font-black">
          {language === "hr"
            ? "ZAVRŠNI REZULTATI"
            : "FINAL RESULTS"}
        </h1>
      </div>

      <section className="card p-5">
        <div className="flex flex-col gap-2">
          {results.players.map(
            (player, index) => {
              const winner =
                player.score ===
                  topScore &&
                topScore > 0;

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                    winner
                      ? "border-accent bg-accent/15"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <span className="w-7 text-center font-black">
                    {index === 0
                      ? "🥇"
                      : index === 1
                      ? "🥈"
                      : index === 2
                      ? "🥉"
                      : `${index + 1}.`}
                  </span>

                  <span className="text-2xl">
                    {player.avatar}
                  </span>

                  <span className="min-w-0 flex-1 truncate font-bold">
                    {player.nickname}
                  </span>

                  <span className="font-black text-accent">
                    {player.score}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </section>

      <p className="text-center text-sm text-white/35">
        {language === "hr"
          ? `Odigrano rundi: ${results.total_rounds}`
          : `Rounds played: ${results.total_rounds}`}
      </p>

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