"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";
import { playSound } from "@/lib/sounds";
import {
  useRoomByIdRealtime,
  useVotesRealtime,
  getMyPlayerInRoom,
  getMyVote,
  submitVote,
} from "@/lib/useRoom";

export default function VotingPage() {
  const params = useParams();
  const router = useRouter();
  const { language, t } = useLanguage();

  const rawRoomId = params.roomId;

  const roomId = Array.isArray(rawRoomId)
    ? rawRoomId[0]
    : rawRoomId;

  const { room, players, loading, error } =
    useRoomByIdRealtime(roomId ?? "");

  const {
    votes,
    loading: votesLoading,
  } = useVotesRealtime(
    room?.current_round_id ?? null
  );

  const [meId, setMeId] =
    useState<string | null>(null);

  const [meLoading, setMeLoading] =
    useState(true);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [alreadyVoted, setAlreadyVoted] =
    useState(false);

  const [voteCheckLoading, setVoteCheckLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [revealing, setRevealing] =
    useState(false);

  const [revealError, setRevealError] =
    useState<string | null>(null);

  const submitLock = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    async function loadMe() {
      try {
        const player =
          await getMyPlayerInRoom(roomId!);

        if (!cancelled) {
          setMeId(player?.id ?? null);
        }
      } catch (e) {
        console.error(
          "Could not load player:",
          e
        );
      } finally {
        if (!cancelled) {
          setMeLoading(false);
        }
      }
    }

    loadMe();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const me =
    players.find(
      (p) => p.id === meId
    ) ?? null;

  useEffect(() => {
    if (
      !meId ||
      !room?.current_round_id
    ) {
      return;
    }

    let cancelled = false;

    async function checkVote() {
      setVoteCheckLoading(true);

      try {
        const existing =
          await getMyVote(
            room!.current_round_id!,
            meId!
          );

        if (cancelled) return;

        if (existing) {
          setAlreadyVoted(true);
          setSelectedId(
            existing.voted_for_player_id
          );
        } else {
          setAlreadyVoted(false);
          setSelectedId(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setSubmitError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće provjeriti tvoj glas."
                : "Could not check your vote.")
          );
        }
      } finally {
        if (!cancelled) {
          setVoteCheckLoading(false);
        }
      }
    }

    checkVote();

    return () => {
      cancelled = true;
    };
  }, [
    meId,
    room?.current_round_id,
  ]);

  useEffect(() => {
    if (!meId) return;

    const existing = votes.find(
      (v) =>
        v.voter_player_id === meId
    );

    if (existing) {
      setAlreadyVoted(true);
      setSelectedId(
        existing.voted_for_player_id
      );
    }
  }, [votes, meId]);

  // AUTOMATIC REVEAL:
  // As soon as every player has voted, the host changes the room
  // to "reveal" and all clients can continue. This removes the
  // problematic manual REVEAL button entirely.
  useEffect(() => {
    if (
      !room ||
      !me ||
      !me.is_host ||
      room.status !== "voting" ||
      players.length === 0 ||
      votes.length < players.length ||
      revealing
    ) {
      return;
    }

    let cancelled = false;

    async function autoReveal() {
      setRevealing(true);
      setRevealError(null);

      try {
        const { error } = await supabase
          .from("rooms")
          .update({ status: "reveal" })
          .eq("id", room!.id);

        if (error) {
          throw new Error(error.message);
        }

        if (!cancelled) {
          window.location.assign(`/reveal/${room!.id}`);
        }
      } catch (e: any) {
        if (!cancelled) {
          const message =
            e?.message ??
            (language === "hr"
              ? "Nije moguće otkriti sumnjivca."
              : "Could not reveal suspect.");
          console.error("Automatic reveal failed:", e);
          setRevealError(message);
          setRevealing(false);
        }
      }
    }

    void autoReveal();

    return () => {
      cancelled = true;
    };
  }, [
    room,
    me,
    players.length,
    votes.length,
    revealing,
  ]);

  // Non-host clients follow the host as soon as the room status changes.
  useEffect(() => {
    if (room?.status === "reveal" && roomId) {
      window.location.assign(`/reveal/${roomId}`);
    }
  }, [room?.status, roomId]);

  async function handleVote() {
    if (
      !room?.current_round_id ||
      !me ||
      !selectedId ||
      alreadyVoted ||
      submitLock.current
    ) {
      return;
    }

    submitLock.current = true;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitVote(
        room.current_round_id,
        me.id,
        selectedId
      );

      playSound("vote");
      setAlreadyVoted(true);
    } catch (e: any) {
      console.error(
        "submitVote failed:",
        e
      );

      setSubmitError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće predati glas."
            : "Could not submit vote.")
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }


  if (!roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-accent">
          {language === "hr" ? "Nedostaje ID sobe." : "Missing room ID."}
        </p>
      </main>
    );
  }

  if (
    loading ||
    meLoading ||
    votesLoading ||
    voteCheckLoading
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/50">
          {language === "hr" ? "Učitavanje glasanja..." : "Loading voting..."}
        </p>
      </main>
    );
  }

  if (
    error ||
    !room
  ) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-6">
        <p className="text-accent">
          {error ??
            (language === "hr" ? "Soba nije pronađena." : "Room not found.")}
        </p>

        <Button
          variant="secondary"
          onClick={() =>
            router.push("/")
          }
        >
          {t("backHome")}
        </Button>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">
          {language === "hr" ? "Nisi dio ove sobe." : "You're not part of this room."}
        </p>
      </main>
    );
  }

  const votesSubmitted =
    votes.length;

  const allVoted =
    players.length > 0 &&
    votesSubmitted >=
      players.length;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <div className="text-center pt-4">
        <p className="text-xs tracking-[0.25em] uppercase text-accent mb-2">
          {t("voting")}
        </p>

        <h1 className="text-3xl font-black">
          {t("whoSuspect")}
        </h1>

        <p className="text-white/40 mt-2">
          {t("choosePlayer")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {players.map(
          (player) => {
            const selected =
              selectedId ===
              player.id;

            return (
              <button
                key={player.id}
                type="button"
                disabled={
                  alreadyVoted ||
                  submitting
                }
                onClick={() => {
                  if (
                    !alreadyVoted &&
                    !submitting
                  ) {
                    setSelectedId(
                      player.id
                    );
                  }
                }}
                className={`
                  w-full
                  rounded-2xl
                  border
                  px-5
                  py-5
                  text-left
                  transition
                  ${
                    selected
                      ? "border-accent bg-accent/20"
                      : "border-white/10 bg-panel2"
                  }
                  ${
                    alreadyVoted
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer"
                  }
                `}
              >
                <span className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-2xl">
                    {player.avatar || "🙂"}
                  </span>

                  <span>
                    {player.nickname}

                    {player.id === meId && (
                      <span className="text-white/40">
                        {" "}
                        {language === "hr" ? "(ti)" : "(you)"}
                      </span>
                    )}
                  </span>
                </span>

                {selected && (
                  <span className="float-right text-accent">
                    ✓
                  </span>
                )}
              </button>
            );
          }
        )}
      </div>

      <p className="text-center text-xs uppercase tracking-widest text-white/40">
        {t("votesSubmitted")}:{" "}
        {votesSubmitted} /{" "}
        {players.length}
      </p>

      {submitError && (
        <p className="text-center text-accent text-sm">
          {submitError}
        </p>
      )}

      {revealError && (
        <p className="text-center text-accent text-sm">
          {revealError}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3 pb-4">
        {!alreadyVoted && (
          <Button
            onClick={
              handleVote
            }
            disabled={
              !selectedId ||
              submitting
            }
          >
            {submitting
              ? language === "hr"
                ? "SLANJE..."
                : "SUBMITTING..."
              : t("vote")}
          </Button>
        )}

        {alreadyVoted &&
          !allVoted && (
            <>
              <p className="text-center text-green-400 font-semibold">
                {language === "hr" ? "✓ GLAS PREDAN" : "✓ VOTE SUBMITTED"}
              </p>

              <p className="text-center text-white/40">
                {t("waitingPlayers")}
              </p>
            </>
          )}

        {alreadyVoted &&
          allVoted &&
          me.is_host && (
            <>
              <p className="text-center text-green-400 font-semibold">
                {language === "hr" ? "✓ SVI SU GLASALI" : "✓ EVERYONE VOTED"}
              </p>

              <p className="text-center text-white/50">
                {revealing
                  ? language === "hr"
                    ? "OTKRIVANJE SUMNJIVCA..."
                    : "REVEALING SUSPECT..."
                  : language === "hr"
                  ? "Priprema otkrivanja..."
                  : "Preparing reveal..."}
              </p>
            </>
          )}

        {alreadyVoted &&
          allVoted &&
          !me.is_host && (
            <p className="text-center text-white/40">
              {language === "hr"
                ? "Čekamo hosta da otkrije sumnjivca..."
                : "Waiting for host to reveal..."}
            </p>
          )}
      </div>
    </main>
  );
}