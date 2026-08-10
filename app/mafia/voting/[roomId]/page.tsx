"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";

import {
  castMafiaVote,
  finishMafiaVotingIfDue,
  getMafiaRoomById,
  getMafiaVoteState,
  type MafiaRoom,
  type MafiaVoteState,
} from "@/lib/mafia";

export default function MafiaVotingPage() {
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

  const [state, setState] =
    useState<MafiaVoteState | null>(
      null
    );

  const [remaining, setRemaining] =
    useState(0);

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

  const finishRequested =
    useRef(false);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    async function load() {
      try {
        const [
          freshRoom,
          freshState,
        ] = await Promise.all([
          getMafiaRoomById(
            roomId
          ),
          getMafiaVoteState(
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
        setState(freshState);

        if (
          freshRoom.status === "reveal"
        ) {
          router.replace(
            `/mafia/reveal/${roomId}`
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
        `mafia-voting-room-${roomId}`
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
            updated.status === "reveal"
          ) {
            router.replace(
              `/mafia/reveal/${roomId}`
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

  useEffect(() => {
    if (
      !roomId ||
      room?.status !== "voting"
    ) {
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const fresh =
          await getMafiaVoteState(
            roomId
          );

        if (!cancelled) {
          setState(fresh);
        }
      } catch {}
    }

    void refresh();

    const interval =
      window.setInterval(
        refresh,
        1000
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        interval
      );
    };
  }, [
    roomId,
    room?.status,
  ]);

  useEffect(() => {
    if (
      !room ||
      room.status !== "voting" ||
      !room.voting_started_at
    ) {
      return;
    }

    finishRequested.current =
      false;

    const startedAt =
      room.voting_started_at;

    const votingTime =
      room.voting_time;

    const currentRoomId =
      room.id;

    function tick() {
      const endsAt =
        new Date(
          startedAt
        ).getTime() +
        votingTime * 1000;

      const secondsLeft =
        Math.max(
          0,
          Math.ceil(
            (endsAt - Date.now()) /
              1000
          )
        );

      setRemaining(
        secondsLeft
      );

      if (
        secondsLeft <= 0 &&
        !finishRequested.current
      ) {
        finishRequested.current =
          true;

        void finishMafiaVotingIfDue(
          currentRoomId
        )
          .then((didFinish) => {
            if (didFinish) {
              router.replace(
                `/mafia/reveal/${currentRoomId}`
              );
            } else {
              finishRequested.current =
                false;
            }
          })
          .catch((e) => {
            console.error(
              "Could not finish Mafia voting:",
              e
            );

            finishRequested.current =
              false;
          });
      }
    }

    tick();

    const timer =
      window.setInterval(
        tick,
        250
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    room,
    router,
  ]);

  const eligiblePlayers =
    useMemo(() => {
      if (!state) return [];

      return state.players.filter(
        (player) =>
          player.id !==
          state.my_player_id
      );
    }, [state]);

  async function handleVote(
    playerId: string
  ) {
    if (
      !roomId ||
      !state?.my_is_alive ||
      submitting
    ) {
      return;
    }

    setSubmitting(playerId);
    setError(null);

    try {
      await castMafiaVote(
        roomId,
        playerId
      );

      const fresh =
        await getMafiaVoteState(
          roomId
        );

      setState(fresh);

      if (
        fresh.status === "reveal"
      ) {
        router.replace(
          `/mafia/reveal/${roomId}`
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
    !room
  ) {
    return null;
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-5 p-6">
      <div className="text-center pt-4">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          ☀️{" "}
          {language === "hr"
            ? "DAN"
            : "DAY"}{" "}
          {state.day_number}
        </p>

        <h1 className="mt-2 text-3xl font-black">
          🗳️{" "}
          {language === "hr"
            ? "TKO JE MAFIJA?"
            : "WHO IS MAFIA?"}
        </h1>

        <div
          className={`mt-3 font-black ${
            remaining <= 10
              ? "text-4xl text-accent"
              : "text-3xl"
          }`}
        >
          {remaining}s
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
        <p className="text-sm text-white/45">
          {language === "hr"
            ? "Glasalo"
            : "Voted"}{" "}
          <span className="font-black text-white">
            {state.vote_count}
            /
            {state.alive_count}
          </span>
        </p>
      </div>

      {!state.my_is_alive ? (
        <div className="mt-auto mb-auto rounded-3xl border border-white/10 bg-panel2 p-8 text-center">
          <div className="text-6xl">
            👻
          </div>

          <h2 className="mt-4 text-2xl font-black">
            {language === "hr"
              ? "SAMO PROMATRAŠ"
              : "SPECTATING"}
          </h2>

          <p className="mt-3 text-white/45">
            {language === "hr"
              ? "Eliminirani igrači ne mogu glasati."
              : "Eliminated players cannot vote."}
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          {eligiblePlayers.map(
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
      )}

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <p className="mt-auto pb-4 text-center text-xs text-white/30">
        {language === "hr"
          ? "Ako je izjednačeno, nitko neće biti eliminiran."
          : "If the vote is tied, nobody will be eliminated."}
      </p>
    </main>
  );
}