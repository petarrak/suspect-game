"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  motion,
  AnimatePresence,
} from "motion/react";

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

  const { language, t } =
    useLanguage();

  const rawRoomId =
    params.roomId;

  const roomId =
    Array.isArray(rawRoomId)
      ? rawRoomId[0]
      : rawRoomId;

  const {
    room,
    players,
    loading,
    error,
  } =
    useRoomByIdRealtime(
      roomId ?? ""
    );

  const {
    votes,
    loading: votesLoading,
  } =
    useVotesRealtime(
      room?.current_round_id ??
        null
    );

  const [
    meId,
    setMeId,
  ] =
    useState<string | null>(
      null
    );

  const [
    meLoading,
    setMeLoading,
  ] = useState(true);

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(
      null
    );

  const [
    alreadyVoted,
    setAlreadyVoted,
  ] = useState(false);

  const [
    voteCheckLoading,
    setVoteCheckLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    submitError,
    setSubmitError,
  ] =
    useState<string | null>(
      null
    );

  const [
    revealing,
    setRevealing,
  ] = useState(false);

  const [
    revealError,
    setRevealError,
  ] =
    useState<string | null>(
      null
    );

  const submitLock =
    useRef(false);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    async function loadMe() {
      try {
        const player =
          await getMyPlayerInRoom(
            roomId!
          );

        if (!cancelled) {
          setMeId(
            player?.id ??
              null
          );
        }
      } catch (e) {
        console.error(
          "Could not load player:",
          e
        );
      } finally {
        if (!cancelled) {
          setMeLoading(
            false
          );
        }
      }
    }

    void loadMe();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const me =
    players.find(
      (player) =>
        player.id === meId
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
      setVoteCheckLoading(
        true
      );

      try {
        const existing =
          await getMyVote(
            room!
              .current_round_id!,
            meId!
          );

        if (cancelled) {
          return;
        }

        if (existing) {
          setAlreadyVoted(
            true
          );

          setSelectedId(
            existing
              .voted_for_player_id
          );
        } else {
          setAlreadyVoted(
            false
          );

          setSelectedId(
            null
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setSubmitError(
            e?.message ??
              (language ===
              "hr"
                ? "Nije moguće provjeriti tvoj glas."
                : "Could not check your vote.")
          );
        }
      } finally {
        if (!cancelled) {
          setVoteCheckLoading(
            false
          );
        }
      }
    }

    void checkVote();

    return () => {
      cancelled = true;
    };
  }, [
    meId,
    room?.current_round_id,
    language,
  ]);

  useEffect(() => {
    if (!meId) {
      return;
    }

    const existing =
      votes.find(
        (vote) =>
          vote.voter_player_id ===
          meId
      );

    if (existing) {
      setAlreadyVoted(
        true
      );

      setSelectedId(
        existing
          .voted_for_player_id
      );
    }
  }, [
    votes,
    meId,
  ]);

  /*
   * AUTOMATIC REVEAL
   *
   * Host changes the room
   * to "reveal" as soon as
   * every player has voted.
   */

  useEffect(() => {
    if (
      !room ||
      !me ||
      !me.is_host ||
      room.status !==
        "voting" ||
      players.length === 0 ||
      votes.length <
        players.length ||
      revealing
    ) {
      return;
    }

    let cancelled = false;

    async function autoReveal() {
      setRevealing(
        true
      );

      setRevealError(
        null
      );

      try {
        const {
          error,
        } =
          await supabase
            .from("rooms")
            .update({
              status:
                "reveal",
            })
            .eq(
              "id",
              room!.id
            );

        if (error) {
          throw new Error(
            error.message
          );
        }

        if (!cancelled) {
          window.location.assign(
            `/reveal/${room!.id}`
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          const message =
            e?.message ??
            (language === "hr"
              ? "Nije moguće otkriti sumnjivca."
              : "Could not reveal suspect.");

          console.error(
            "Automatic reveal failed:",
            e
          );

          setRevealError(
            message
          );

          setRevealing(
            false
          );
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
    language,
  ]);

  /*
   * Non-host clients follow
   * the host when reveal begins.
   */

  useEffect(() => {
    if (
      room?.status ===
        "reveal" &&
      roomId
    ) {
      window.location.assign(
        `/reveal/${roomId}`
      );
    }
  }, [
    room?.status,
    roomId,
  ]);

  function handleSelectPlayer(
    playerId: string
  ) {
    if (
      alreadyVoted ||
      submitting
    ) {
      return;
    }

    if (
      selectedId !== playerId
    ) {
      playSound(
        "click",
        0.45
      );
    }

    setSelectedId(
      playerId
    );
  }

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

    submitLock.current =
      true;

    setSubmitting(
      true
    );

    setSubmitError(
      null
    );

    try {
      await submitVote(
        room.current_round_id,
        me.id,
        selectedId
      );

      playSound(
        "vote",
        0.75
      );

      setAlreadyVoted(
        true
      );
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
      submitLock.current =
        false;

      setSubmitting(
        false
      );
    }
  }

  if (!roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-accent">
          {language === "hr"
            ? "Nedostaje ID sobe."
            : "Missing room ID."}
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
      <main className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          className="text-center"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
        >
          <motion.div
            className="text-6xl"
            animate={{
              scale: [
                1,
                1.08,
                1,
              ],
            }}
            transition={{
              duration: 1.5,
              repeat:
                Infinity,
            }}
          >
            🗳️
          </motion.div>

          <p className="mt-4 text-white/50">
            {language === "hr"
              ? "Učitavanje glasanja..."
              : "Loading voting..."}
          </p>
        </motion.div>
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
            (language === "hr"
              ? "Soba nije pronađena."
              : "Room not found.")}
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
          {language === "hr"
            ? "Nisi dio ove sobe."
            : "You're not part of this room."}
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

  const voteProgress =
    players.length > 0
      ? Math.min(
          100,
          (votesSubmitted /
            players.length) *
            100
        )
      : 0;

  return (
    <motion.main
      className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6"
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.3,
      }}
    >
      <motion.div
        className="text-center pt-4"
        initial={{
          opacity: 0,
          y: -14,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.3,
        }}
      >
        <p className="text-xs font-black tracking-[0.25em] uppercase text-accent mb-2">
          🕵️ SUSPECT
        </p>

        <h1 className="text-3xl font-black">
          {t("whoSuspect")}
        </h1>

        <p className="text-white/40 mt-2">
          {t("choosePlayer")}
        </p>
      </motion.div>

      <motion.div
        className="rounded-2xl border border-white/10 bg-black/20 p-4"
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-white/40">
            {t(
              "votesSubmitted"
            )}
          </span>

          <span className="font-black text-accent">
            {votesSubmitted}
            /
            {players.length}
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{
              width:
                `${voteProgress}%`,
            }}
            transition={{
              duration: 0.35,
            }}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        <div className="flex flex-col gap-3">
          {players.map(
            (
              player,
              index
            ) => {
              const selected =
                selectedId ===
                player.id;

              return (
                <motion.button
                  key={
                    player.id
                  }
                  type="button"
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -16,
                    scale: 0.97,
                  }}
                  whileHover={
                    alreadyVoted
                      ? undefined
                      : {
                          scale: 1.02,
                          y: -2,
                        }
                  }
                  whileTap={
                    alreadyVoted
                      ? undefined
                      : {
                          scale: 0.97,
                        }
                  }
                  transition={{
                    duration: 0.2,
                    delay:
                      index *
                      0.025,
                  }}
                  disabled={
                    alreadyVoted ||
                    submitting
                  }
                  onClick={() =>
                    handleSelectPlayer(
                      player.id
                    )
                  }
                  className={`
                    relative
                    w-full
                    rounded-2xl
                    border
                    px-5
                    py-5
                    text-left
                    transition
                    ${
                      selected
                        ? "border-accent bg-accent/20 shadow-xl shadow-accent/30 scale-[1.02]"
                        : "border-white/10 bg-panel2"
                    }
                    ${
                      alreadyVoted
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-pointer"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <motion.span
                      className="text-3xl"
                      animate={
                        selected
                          ? {
                              scale:
                                1.12,
                            }
                          : {
                              scale:
                                1,
                            }
                      }
                    >
                      {player.avatar ||
                        "🙂"}
                    </motion.span>

                    <span className="min-w-0 flex-1 truncate text-lg font-semibold">
                      {
                        player.nickname
                      }

                      {player.id ===
                        meId && (
                        <span className="text-white/40">
                          {" "}
                          {language ===
                          "hr"
                            ? "(ti)"
                            : "(you)"}
                        </span>
                      )}
                    </span>

                    <AnimatePresence>
                      {selected && (
                        <motion.span
                          initial={{
                            scale: 0,
                            opacity: 0,
                            rotate:
                              -30,
                          }}
                          animate={{
                            scale: 1,
                            opacity: 1,
                            rotate: 0,
                          }}
                          exit={{
                            scale: 0,
                            opacity: 0,
                          }}
                          transition={{
                            type: "spring",
                            stiffness:
                              320,
                            damping:
                              18,
                          }}
                          className="text-2xl font-black text-accent"
                        >
                          ✓
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              );
            }
          )}
        </div>
      </AnimatePresence>

      {submitError && (
        <motion.p
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          className="text-center text-accent text-sm"
        >
          {submitError}
        </motion.p>
      )}

      {revealError && (
        <motion.p
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          className="text-center text-accent text-sm"
        >
          {revealError}
        </motion.p>
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
              ? language ===
                "hr"
                ? "SLANJE..."
                : "SUBMITTING..."
              : `🗳️ ${t(
                  "vote"
                )}`}
          </Button>
        )}

        <AnimatePresence>
          {alreadyVoted &&
            !allVoted && (
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.9,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                className="rounded-2xl border border-green-400/20 bg-green-400/10 p-4 text-center"
              >
                <p className="font-black text-green-300">
                  ✅{" "}
                  {language ===
                  "hr"
                    ? "GLAS PREDAN"
                    : "VOTE SUBMITTED"}
                </p>

                <p className="mt-2 text-sm text-white/40">
                  {t(
                    "waitingPlayers"
                  )}
                </p>
              </motion.div>
            )}
        </AnimatePresence>

        {alreadyVoted &&
          allVoted &&
          me.is_host && (
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              className="rounded-2xl border border-green-400/20 bg-green-400/10 p-4 text-center"
            >
              <p className="font-black text-green-300">
                ✅{" "}
                {language ===
                "hr"
                  ? "SVI SU GLASALI"
                  : "EVERYONE VOTED"}
              </p>

              <motion.p
                className="mt-2 text-sm text-white/50"
                animate={{
                  opacity: [
                    0.4,
                    1,
                    0.4,
                  ],
                }}
                transition={{
                  duration: 1.2,
                  repeat:
                    Infinity,
                }}
              >
                {revealing
                  ? language ===
                    "hr"
                    ? "OTKRIVANJE SUMNJIVCA..."
                    : "REVEALING SUSPECT..."
                  : language ===
                    "hr"
                  ? "Priprema otkrivanja..."
                  : "Preparing reveal..."}
              </motion.p>
            </motion.div>
          )}

        {alreadyVoted &&
          allVoted &&
          !me.is_host && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center"
            >
              <p className="text-white/40">
                {language ===
                "hr"
                  ? "Čekamo otkrivanje sumnjivca..."
                  : "Waiting for suspect reveal..."}
              </p>
            </motion.div>
          )}
      </div>
    </motion.main>
  );
}