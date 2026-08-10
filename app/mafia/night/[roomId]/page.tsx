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

import { motion } from "motion/react";

import { useLanguage } from "@/components/LanguageProvider";

import { playSound } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";

import {
  getMafiaNightState,
  submitMafiaNightAction,
  type MafiaNightActionResult,
  type MafiaNightState,
  type MafiaRoom,
} from "@/lib/mafia";

export default function MafiaNightPage() {
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

  const [
    state,
    setState,
  ] =
    useState<MafiaNightState | null>(
      null
    );

  const [
    actionResult,
    setActionResult,
  ] =
    useState<MafiaNightActionResult | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] =
    useState<string | null>(
      null
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const nightSoundPlayed =
    useRef(false);

  const morningSoundPlayed =
    useRef(false);

  function goToDay() {
    if (!roomId) {
      return;
    }

    if (
      !morningSoundPlayed.current
    ) {
      morningSoundPlayed.current =
        true;

      playSound(
        "reveal",
        0.7
      );
    }

    router.replace(
      `/mafia/day/${roomId}`
    );
  }

  async function refreshState() {
    if (!roomId) {
      return;
    }

    const fresh =
      await getMafiaNightState(
        roomId
      );

    setState(fresh);

    if (
      fresh.status === "day"
    ) {
      goToDay();
    }
  }

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const fresh =
          await getMafiaNightState(
            roomId
          );

        if (cancelled) {
          return;
        }

        setState(fresh);

        if (
          fresh.status === "day"
        ) {
          goToDay();
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              (language === "hr"
                ? "Nije moguće učitati noć."
                : "Could not load night.")
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
    if (
      loading ||
      !state ||
      nightSoundPlayed.current
    ) {
      return;
    }

    nightSoundPlayed.current =
      true;

    playSound(
      "start",
      0.45
    );
  }, [
    loading,
    state,
  ]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `mafia-night-room-${roomId}`
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

            if (
              updated.status ===
              "day"
            ) {
              goToDay();
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

  const eligibleTargets =
    useMemo(() => {
      if (!state) {
        return [];
      }

      if (
        state.my_role ===
        "MAFIA"
      ) {
        return state.players.filter(
          (player) =>
            player.id !==
            state.my_player_id
        );
      }

      if (
        state.my_role ===
        "DETECTIVE"
      ) {
        return state.players.filter(
          (player) =>
            player.id !==
            state.my_player_id
        );
      }

      return state.players;
    }, [state]);

  async function handleAction(
    playerId: string
  ) {
    if (
      !roomId ||
      submitting ||
      !state
    ) {
      return;
    }

    setSubmitting(
      playerId
    );

    setError(null);

    try {
      if (
        state.my_role ===
        "MAFIA"
      ) {
        playSound(
          "combat",
          0.75
        );
      } else if (
        state.my_role ===
        "DOCTOR"
      ) {
        playSound(
          "click",
          0.6
        );
      } else if (
        state.my_role ===
        "DETECTIVE"
      ) {
        playSound(
          "reveal",
          0.65
        );
      }

      const result =
        await submitMafiaNightAction(
          roomId,
          playerId
        );

      setActionResult(
        result
      );

      if (
        state.my_role ===
          "DETECTIVE" &&
        result.action_type ===
          "INVESTIGATE"
      ) {
        window.setTimeout(
          () => {
            if (
              result.investigation_is_mafia
            ) {
              playSound(
                "caught",
                0.75
              );
            } else {
              playSound(
                "click",
                0.65
              );
            }
          },
          250
        );
      }

      if (
        result.night_resolved
      ) {
        window.setTimeout(
          () => {
            goToDay();
          },
          state.my_role ===
            "DETECTIVE"
            ? 850
            : 250
        );

        return;
      }

      await refreshState();
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Akcija nije spremljena."
            : "Action was not saved.")
      );
    } finally {
      setSubmitting(
        null
      );
    }
  }

  if (loading) {
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
              duration: 2,
              repeat: Infinity,
            }}
          >
            🌙
          </motion.div>

          <p className="mt-4 text-white/50">
            {language === "hr"
              ? "Noć počinje..."
              : "Night is beginning..."}
          </p>
        </motion.div>
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

  if (!state) {
    return null;
  }

  const hasAction =
    state.my_role !==
      "CIVILIAN" &&
    state.my_is_alive;

  const title =
    state.my_role ===
    "MAFIA"
      ? language === "hr"
        ? "ODABERI ŽRTVU"
        : "CHOOSE A VICTIM"
      : state.my_role ===
        "DOCTOR"
      ? language === "hr"
        ? "KOGA ŽELIŠ SPASITI?"
        : "WHO DO YOU WANT TO SAVE?"
      : state.my_role ===
        "DETECTIVE"
      ? language === "hr"
        ? "KOGA ŽELIŠ ISTRAŽITI?"
        : "WHO DO YOU WANT TO INVESTIGATE?"
      : language === "hr"
      ? "SPAVAJ..."
      : "SLEEP...";

  const emoji =
    state.my_role ===
    "MAFIA"
      ? "🔪"
      : state.my_role ===
        "DOCTOR"
      ? "💉"
      : state.my_role ===
        "DETECTIVE"
      ? "🔎"
      : "🌙";

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <motion.div
        className="text-center pt-5"
        initial={{
          opacity: 0,
          y: -20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.45,
        }}
      >
        <motion.p
          className="text-xs font-black uppercase tracking-[0.25em] text-accent"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
        >
          🌙{" "}
          {language === "hr"
            ? "NOĆ"
            : "NIGHT"}{" "}
          {state.day_number}
        </motion.p>

        <motion.div
          className="mt-5 text-6xl"
          initial={{
            opacity: 0,
            scale: 0,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            delay: 0.15,
            type: "spring",
            stiffness: 180,
          }}
        >
          {emoji}
        </motion.div>

        <motion.h1
          className="mt-3 text-3xl font-black"
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.25,
          }}
        >
          {title}
        </motion.h1>
      </motion.div>

      {!state.my_is_alive ? (
        <motion.div
          className="mt-auto mb-auto rounded-3xl border border-white/10 bg-panel2 p-7 text-center"
          initial={{
            opacity: 0,
            scale: 0.9,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
        >
          <motion.div
            className="text-6xl"
            animate={{
              y: [
                0,
                -8,
                0,
              ],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
            }}
          >
            👻
          </motion.div>

          <p className="mt-4 text-xl font-black">
            {language === "hr"
              ? "ELIMINIRAN SI"
              : "YOU ARE ELIMINATED"}
          </p>

          <p className="mt-3 text-white/45">
            {language === "hr"
              ? "Možeš pratiti igru, ali više nemaš noćnu akciju."
              : "You can watch the game, but you no longer have a night action."}
          </p>
        </motion.div>
      ) : hasAction ? (
        <>
          <motion.p
            className="text-center text-sm text-white/40"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.35,
            }}
          >
            {state.my_role ===
            "MAFIA"
              ? language ===
                "hr"
                ? "Odaberi igrača kojeg Mafija želi ukloniti."
                : "Choose the player the Mafia wants to eliminate."
              : state.my_role ===
                "DOCTOR"
              ? language ===
                "hr"
                ? "Možeš spasiti bilo kojeg živog igrača, uključujući sebe."
                : "You may save any living player, including yourself."
              : language ===
                "hr"
              ? "Rezultat istrage vidiš samo ti."
              : "Only you will see the investigation result."}
          </motion.p>

          <section className="flex flex-col gap-3">
            {eligibleTargets.map(
              (
                player,
                index
              ) => {
                const selected =
                  state.selected_target_player_id ===
                    player.id ||
                  actionResult?.target_player_id ===
                    player.id;

                return (
                  <motion.button
                    key={
                      player.id
                    }
                    type="button"
                    disabled={
                      submitting !==
                      null
                    }
                    onClick={() =>
                      handleAction(
                        player.id
                      )
                    }
                    initial={{
                      opacity: 0,
                      x: -15,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay:
                        0.4 +
                        index *
                          0.05,
                    }}
                    whileTap={{
                      scale: 0.97,
                    }}
                    className={`flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${
                      selected
                        ? "border-accent bg-accent/15"
                        : "border-white/10 bg-panel2"
                    }`}
                  >
                    <span className="text-3xl">
                      {
                        player.avatar
                      }
                    </span>

                    <span className="min-w-0 flex-1 truncate font-black">
                      {
                        player.nickname
                      }
                    </span>

                    <span>
                      {submitting ===
                      player.id
                        ? "..."
                        : selected
                        ? "✅"
                        : "›"}
                    </span>
                  </motion.button>
                );
              }
            )}
          </section>

          {state.my_role ===
            "DETECTIVE" &&
            actionResult?.action_type ===
              "INVESTIGATE" && (
              <motion.div
                className={`rounded-3xl border p-6 text-center ${
                  actionResult.investigation_is_mafia
                    ? "border-red-400/30 bg-red-400/10"
                    : "border-green-400/30 bg-green-400/10"
                }`}
                initial={{
                  opacity: 0,
                  scale: 0.8,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 180,
                }}
              >
                <motion.div
                  className="text-5xl"
                  initial={{
                    scale: 0,
                  }}
                  animate={{
                    scale: 1,
                  }}
                  transition={{
                    delay: 0.1,
                    type: "spring",
                    stiffness: 220,
                  }}
                >
                  {actionResult.investigation_is_mafia
                    ? "🔪"
                    : "✅"}
                </motion.div>

                <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-white/35">
                  {language === "hr"
                    ? "REZULTAT ISTRAGE"
                    : "INVESTIGATION RESULT"}
                </p>

                <motion.p
                  className={`mt-3 text-2xl font-black ${
                    actionResult.investigation_is_mafia
                      ? "text-red-300"
                      : "text-green-300"
                  }`}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.2,
                  }}
                >
                  {actionResult.investigation_is_mafia
                    ? language ===
                      "hr"
                      ? "OVAJ IGRAČ JE MAFIJA"
                      : "THIS PLAYER IS MAFIA"
                    : language ===
                      "hr"
                    ? "OVAJ IGRAČ NIJE MAFIJA"
                    : "THIS PLAYER IS NOT MAFIA"}
                </motion.p>

                <p className="mt-3 text-xs text-white/35">
                  {language === "hr"
                    ? "Ovaj rezultat vidiš samo ti."
                    : "Only you can see this result."}
                </p>
              </motion.div>
            )}

          {(state.selected_target_player_id ||
            actionResult) && (
            <motion.div
              className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center"
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
            >
              <p className="font-black text-green-300">
                ✅{" "}
                {language === "hr"
                  ? "AKCIJA SPREMLJENA"
                  : "ACTION SAVED"}
              </p>

              <p className="mt-2 text-sm text-white/40">
                {language === "hr"
                  ? "Čekamo ostale noćne uloge."
                  : "Waiting for the other night roles."}
              </p>
            </motion.div>
          )}
        </>
      ) : (
        <motion.div
          className="mt-auto mb-auto rounded-3xl border border-white/10 bg-panel2 p-8 text-center"
          initial={{
            opacity: 0,
            scale: 0.92,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
        >
          <motion.div
            className="text-7xl"
            animate={{
              rotate: [
                -3,
                3,
                -3,
              ],
              scale: [
                1,
                1.04,
                1,
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
          >
            😴
          </motion.div>

          <h2 className="mt-5 text-2xl font-black">
            {language === "hr"
              ? "ČEKAJ JUTRO"
              : "WAIT FOR MORNING"}
          </h2>

          <p className="mt-3 text-white/45">
            {language === "hr"
              ? "Civili nemaju noćnu akciju. Ne pokazuj drugima svoju ulogu."
              : "Civilians have no night action. Keep your role secret."}
          </p>
        </motion.div>
      )}

      {error && (
        <p className="text-center text-sm text-accent">
          {error}
        </p>
      )}

      <p className="mt-auto pb-4 text-center text-xs text-white/25">
        {language === "hr"
          ? "Jutro počinje automatski kad su sve noćne akcije završene."
          : "Morning begins automatically when all night actions are complete."}
      </p>
    </main>
  );
}