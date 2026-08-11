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

import { motion } from "motion/react";

import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";

import { playSound } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";

import {
  chooseDrawGuessWord,
  getDrawGuessPlayers,
  getDrawGuessRoomById,
  getDrawGuessWordChoices,
  getMyDrawGuessPlayerInRoom,
  type DrawGuessPlayer,
  type DrawGuessRoom,
  type DrawGuessWordChoice,
} from "@/lib/drawGuess";

export default function DrawGuessChoosePage() {
  const params =
    useParams();

  const router =
    useRouter();

  const {
    language,
  } = useLanguage();

  const rawRoomId =
    params.roomId;

  const roomId =
    Array.isArray(
      rawRoomId
    )
      ? rawRoomId[0]
      : rawRoomId;

  const [
    room,
    setRoom,
  ] =
    useState<
      DrawGuessRoom | null
    >(null);

  const [
    me,
    setMe,
  ] =
    useState<
      DrawGuessPlayer | null
    >(null);

  const [
    players,
    setPlayers,
  ] =
    useState<
      DrawGuessPlayer[]
    >([]);

  const [
    choices,
    setChoices,
  ] =
    useState<
      DrawGuessWordChoice[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    choosing,
    setChoosing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const isDrawer =
    useMemo(() => {
      if (
        !room ||
        !me
      ) {
        return false;
      }

      return (
        room.current_drawer_player_id ===
        me.id
      );
    }, [
      room,
      me,
    ]);

  const drawer =
    useMemo(() => {
      if (
        !room
      ) {
        return null;
      }

      return (
        players.find(
          (
            player
          ) =>
            player.id ===
            room.current_drawer_player_id
        ) ?? null
      );
    }, [
      room,
      players,
    ]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled =
      false;

    async function load() {
      try {
        const [
          freshRoom,
          freshMe,
          freshPlayers,
        ] =
          await Promise.all([
            getDrawGuessRoomById(
              roomId
            ),

            getMyDrawGuessPlayerInRoom(
              roomId
            ),

            getDrawGuessPlayers(
              roomId
            ),
          ]);

        if (
          cancelled
        ) {
          return;
        }

        if (
          !freshRoom ||
          !freshMe
        ) {
          throw new Error(
            language === "hr"
              ? "Nije moguće učitati igru."
              : "Could not load game."
          );
        }

        setRoom(
          freshRoom
        );

        setMe(
          freshMe
        );

        setPlayers(
          freshPlayers
        );

        if (
          freshRoom.status ===
          "drawing"
        ) {
          router.replace(
            `/draw-guess/game/${roomId}`
          );

          return;
        }

        if (
          freshRoom.status ===
          "ended"
        ) {
          router.replace(
            `/draw-guess/results/${roomId}`
          );

          return;
        }

        if (
          freshRoom.current_drawer_player_id ===
          freshMe.id
        ) {
          const freshChoices =
            await getDrawGuessWordChoices(
              roomId
            );

          if (
            cancelled
          ) {
            return;
          }

          setChoices(
            freshChoices
          );
        }
      } catch (e: any) {
        if (
          !cancelled
        ) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati izbor riječi."
                : "Could not load word choices.")
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled =
        true;
    };
  }, [
    roomId,
    language,
    router,
  ]);

  useEffect(() => {
    if (
      !roomId ||
      !isDrawer ||
      room?.status !== "choosing" ||
      choices.length > 0
    ) {
      return;
    }

    let cancelled = false;
    let requesting = false;

    async function loadChoices() {
      if (requesting) {
        return;
      }

      requesting = true;

      try {
        const freshChoices =
          await getDrawGuessWordChoices(
            roomId
          );

        if (
          !cancelled &&
          freshChoices.length > 0
        ) {
          setChoices(
            freshChoices
          );

          setError(
            null
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati izbor riječi."
                : "Could not load word choices.")
          );
        }
      } finally {
        requesting = false;
      }
    }

    void loadChoices();

    const interval =
      window.setInterval(
        () => {
          void loadChoices();
        },
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
    isDrawer,
    choices.length,
    language,
  ]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const roomChannel =
      supabase
        .channel(
          `draw-guess-choose-room-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",

            schema:
              "public",

            table:
              "draw_guess_rooms",

            filter:
              `id=eq.${roomId}`,
          },
          (
            payload
          ) => {
            const updated =
              payload.new as DrawGuessRoom;

            setRoom(
              updated
            );

            if (
              updated.status ===
              "drawing"
            ) {
              router.replace(
                `/draw-guess/game/${roomId}`
              );
            }

            if (
              updated.status ===
              "ended"
            ) {
              router.replace(
                `/draw-guess/results/${roomId}`
              );
            }
          }
        )
        .subscribe();

    const playersChannel =
      supabase
        .channel(
          `draw-guess-choose-players-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "*",

            schema:
              "public",

            table:
              "draw_guess_players",

            filter:
              `room_id=eq.${roomId}`,
          },
          async () => {
            try {
              const freshPlayers =
                await getDrawGuessPlayers(
                  roomId
                );

              setPlayers(
                freshPlayers
              );
            } catch {}
          }
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        roomChannel
      );

      void supabase.removeChannel(
        playersChannel
      );
    };
  }, [
    roomId,
    router,
  ]);

  async function handleChoose(
    wordId: number
  ) {
    if (
      !roomId ||
      !isDrawer ||
      choosing
    ) {
      return;
    }

    setChoosing(
      true
    );

    setError(
      null
    );

    try {
      playSound(
        "click",
        0.55
      );

      await chooseDrawGuessWord(
        roomId,
        wordId
      );

      router.replace(
        `/draw-guess/game/${roomId}`
      );
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće odabrati riječ."
            : "Could not choose word.")
      );

      setChoosing(
        false
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          className="text-center"
          initial={{
            opacity:
              0,
          }}
          animate={{
            opacity:
              1,
          }}
        >
          <motion.div
            className="text-7xl"
            animate={{
              rotate: [
                -6,
                6,
                -6,
              ],
            }}
            transition={{
              duration:
                1.2,

              repeat:
                Infinity,
            }}
          >
            🎨
          </motion.div>

          <p className="mt-4 text-white/45">
            {language === "hr"
              ? "Priprema riječi..."
              : "Preparing words..."}
          </p>
        </motion.div>
      </main>
    );
  }

  if (
    error &&
    !room
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-accent">
          {
            error
          }
        </p>
      </main>
    );
  }

  if (
    !room ||
    !me
  ) {
    return null;
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <motion.header
        className="text-center pt-6"
        initial={{
          opacity:
            0,

          y:
            -15,
        }}
        animate={{
          opacity:
            1,

          y:
            0,
        }}
      >
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          🎨 DRAW & GUESS
        </p>

        <p className="mt-2 text-sm text-white/35">
          {language === "hr"
            ? "RUNDA"
            : "ROUND"}{" "}
          {
            room.current_round
          }
          {" / "}
          {
            room.total_rounds
          }
        </p>
      </motion.header>

      {isDrawer ? (
        <>
          <motion.section
            className="rounded-3xl border border-accent/30 bg-accent/10 p-6 text-center"
            initial={{
              opacity:
                0,

              scale:
                0.95,
            }}
            animate={{
              opacity:
                1,

              scale:
                1,
            }}
          >
            <div className="text-6xl">
              ✏️
            </div>

            <h1 className="mt-3 text-3xl font-black">
              {language === "hr"
                ? "TI CRTAŠ!"
                : "YOU DRAW!"}
            </h1>

            <p className="mt-2 text-white/45">
              {language === "hr"
                ? "Odaberi jednu od 3 riječi."
                : "Choose one of 3 words."}
            </p>
          </motion.section>

          <section className="flex flex-col gap-3">
            {choices.map(
              (
                choice,
                index
              ) => {
                const word =
                  language === "hr"
                    ? choice.word_hr
                    : choice.word_en;

                return (
                  <motion.button
                    key={
                      choice.id
                    }
                    type="button"
                    disabled={
                      choosing
                    }
                    onClick={() =>
                      handleChoose(
                        choice.id
                      )
                    }
                    initial={{
                      opacity:
                        0,

                      x:
                        -15,
                    }}
                    animate={{
                      opacity:
                        1,

                      x:
                        0,
                    }}
                    transition={{
                      delay:
                        0.15 +
                        index *
                          0.08,
                    }}
                    whileTap={{
                      scale:
                        0.97,
                    }}
                    className="rounded-2xl border border-white/10 bg-panel2 p-5 text-left transition hover:border-accent/50 disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-2xl font-black capitalize">
                          {
                            word
                          }
                        </p>

                        <p className="mt-1 text-xs uppercase tracking-widest text-white/30">
                          {
                            choice.category
                          }
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                            choice.difficulty ===
                            "easy"
                              ? "bg-green-500/15 text-green-300"
                              : choice.difficulty ===
                                "medium"
                              ? "bg-yellow-500/15 text-yellow-300"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          {
                            choice.difficulty
                          }
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              }
            )}
          </section>

          {choices.length ===
            0 &&
            !error && (
              <p className="text-center text-white/40">
                {language === "hr"
                  ? "Učitavanje riječi..."
                  : "Loading words..."}
              </p>
            )}
        </>
      ) : (
        <motion.section
          className="mt-10 flex flex-col items-center gap-6 text-center"
          initial={{
            opacity:
              0,

            scale:
              0.95,
          }}
          animate={{
            opacity:
              1,

            scale:
              1,
          }}
        >
          <motion.div
            className="text-8xl"
            animate={{
              y: [
                0,
                -8,
                0,
              ],
            }}
            transition={{
              duration:
                1.5,

              repeat:
                Infinity,
            }}
          >
            🤔
          </motion.div>

          <div>
            <h1 className="text-3xl font-black">
              {language === "hr"
                ? "CRTAČ BIRA RIJEČ..."
                : "DRAWER IS CHOOSING..."}
            </h1>

            <p className="mt-3 text-white/45">
              {drawer
                ? `${drawer.avatar} ${drawer.nickname}`
                : language ===
                  "hr"
                ? "Čekamo crtača..."
                : "Waiting for drawer..."}
            </p>
          </div>

          <motion.div
            className="flex gap-2"
            initial={{
              opacity:
                0.4,
            }}
            animate={{
              opacity: [
                0.35,
                1,
                0.35,
              ],
            }}
            transition={{
              duration:
                1.2,

              repeat:
                Infinity,
            }}
          >
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-accent" />
          </motion.div>
        </motion.section>
      )}

      {error && (
        <div className="rounded-2xl border border-accent/25 bg-accent/10 p-4">
          <p className="text-center text-sm text-accent">
            {
              error
            }
          </p>
        </div>
      )}

      <div className="mt-auto">
        <Button
          variant="secondary"
          onClick={() =>
            router.push(
              "/"
            )
          }
        >
          🏠 PARTY GAMES
        </Button>
      </div>
    </main>
  );
}