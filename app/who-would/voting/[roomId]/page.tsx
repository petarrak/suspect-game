"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";

import {
  castWhoWouldVote,
  getWhoWouldQuestion,
  getWhoWouldRoomById,
  getWhoWouldVoteState,
  type WhoWouldQuestion,
  type WhoWouldRoom,
  type WhoWouldVoteState,
} from "@/lib/whoWould";

export default function WhoWouldVotingPage() {
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
    useState<WhoWouldRoom | null>(
      null
    );

  const [question, setQuestion] =
    useState<WhoWouldQuestion | null>(
      null
    );

  const [state, setState] =
    useState<WhoWouldVoteState | null>(
      null
    );

  const [submitting, setSubmitting] =
    useState<string | null>(
      null
    );

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
          freshQuestion,
          freshState,
        ] = await Promise.all([
          getWhoWouldRoomById(
            roomId
          ),
          getWhoWouldQuestion(
            roomId
          ),
          getWhoWouldVoteState(
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
        setQuestion(
          freshQuestion
        );
        setState(freshState);

        if (
          freshRoom.status === "reveal"
        ) {
          router.replace(
            `/who-would/reveal/${roomId}`
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              "Could not load voting."
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
        `who-would-voting-${roomId}`
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
            updated.status === "reveal"
          ) {
            router.replace(
              `/who-would/reveal/${roomId}`
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

  async function handleVote(
    playerId: string
  ) {
    if (
      !roomId ||
      submitting
    ) {
      return;
    }

    setSubmitting(playerId);
    setError(null);

    try {
      await castWhoWouldVote(
        roomId,
        playerId
      );

      const fresh =
        await getWhoWouldVoteState(
          roomId
        );

      setState(fresh);

      if (
        fresh.status === "reveal"
      ) {
        router.replace(
          `/who-would/reveal/${roomId}`
        );
      }
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Glas nije spremljen."
            : "Vote was not saved.")
      );
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-white/50">
          {language === "hr"
            ? "Učitavanje glasanja..."
            : "Loading voting..."}
        </p>
      </main>
    );
  }

  if (
    error &&
    !state
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
    !state ||
    !question ||
    !room
  ) {
    return null;
  }

  const text =
    language === "hr"
      ? question.question_hr
      : question.question_en;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-5 p-6">
      <div className="text-center pt-4">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          😂 WHO WOULD?
        </p>

        <h1 className="mt-3 text-xl font-black leading-snug">
          {text}
        </h1>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
        <p className="text-sm text-white/45">
          {language === "hr"
            ? "Glasalo"
            : "Voted"}{" "}
          <span className="font-black text-white">
            {state.vote_count}
            /
            {state.player_count}
          </span>
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {state.players.map(
          (player) => {
            const selected =
              state.my_vote_player_id ===
              player.id;

            return (
              <button
                key={player.id}
                type="button"
                disabled={
                  submitting !== null
                }
                onClick={() =>
                  handleVote(
                    player.id
                  )
                }
                className={`flex items-center gap-4 rounded-2xl border px-4 py-4 text-left active:scale-[0.98] ${
                  selected
                    ? "border-accent bg-accent/15"
                    : "border-white/10 bg-panel2"
                }`}
              >
                <span className="text-3xl">
                  {player.avatar}
                </span>

                <span className="min-w-0 flex-1 truncate font-black">
                  {player.nickname}
                </span>

                <span>
                  {selected
                    ? "✅"
                    : "›"}
                </span>
              </button>
            );
          }
        )}
      </section>

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <p className="mt-auto pb-4 text-center text-xs text-white/30">
        {language === "hr"
          ? "Možeš glasati i za sebe. Rezultat se otkriva kad svi glasaju."
          : "You can vote for yourself. Results reveal when everyone has voted."}
      </p>
    </main>
  );
}