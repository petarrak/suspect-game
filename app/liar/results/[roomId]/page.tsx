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
  getLiarRoomById,
  getMyLiarPlayerInRoom,
  rematchLiarGame,
  type LiarPlayer,
  type LiarRoom,
} from "@/lib/liar";

export default function LiarResultsPage() {
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

  const [players, setPlayers] =
    useState<LiarPlayer[]>([]);

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
          freshRoom,
          freshMe,
        ] = await Promise.all([
          getLiarRoomById(roomId),
          getMyLiarPlayerInRoom(
            roomId
          ),
        ]);

        const {
          data,
          error,
        } = await supabase
          .from("liar_players")
          .select("*")
          .eq(
            "room_id",
            roomId
          )
          .order("score", {
            ascending: false,
          })
          .order("joined_at", {
            ascending: true,
          });

        if (error) {
          throw new Error(
            error.message
          );
        }

        if (
          cancelled ||
          !freshRoom ||
          !freshMe
        ) {
          return;
        }

        setRoom(freshRoom);
        setMe(freshMe);
        setPlayers(
          (data ?? []) as LiarPlayer[]
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
        `liar-results-room-${roomId}`
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
            updated.status === "waiting"
          ) {
            router.replace(
              `/liar/room/${updated.code}`
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

  const winner =
    useMemo(
      () => players[0] ?? null,
      [players]
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
      await rematchLiarGame(
        roomId
      );

      if (room) {
        router.replace(
          `/liar/room/${room.code}`
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

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6 pb-8">
      <div className="text-center pt-7">
        <div className="text-6xl">
          🏆
        </div>

        <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-accent">
          LIAR
        </p>

        <h1 className="mt-2 text-3xl font-black">
          {language === "hr"
            ? "ZAVRŠNI REZULTATI"
            : "FINAL RESULTS"}
        </h1>
      </div>

      {winner && (
        <section className="rounded-3xl border border-yellow-400/25 bg-yellow-400/10 p-7 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
            {language === "hr"
              ? "POBJEDNIK"
              : "WINNER"}
          </p>

          <div className="mt-4 text-6xl">
            {winner.avatar}
          </div>

          <h2 className="mt-3 text-3xl font-black">
            {winner.nickname}
          </h2>

          <p className="mt-2 text-xl font-black text-yellow-300">
            {winner.score} pts
          </p>
        </section>
      )}

      <section className="card p-5">
        <div className="flex flex-col gap-2">
          {players.map(
            (player, index) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <span className="w-7 text-center font-black text-white/35">
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
            )
          )}
        </div>
      </section>

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {me?.is_host && (
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
          🏠{" "}
          {language === "hr"
            ? "PARTY GAMES"
            : "PARTY GAMES"}
        </Button>
      </div>
    </main>
  );
}