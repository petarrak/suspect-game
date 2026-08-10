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

import { useLanguage } from "@/components/LanguageProvider";
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

  const [state, setState] =
    useState<MafiaNightState | null>(
      null
    );

  const [
    actionResult,
    setActionResult,
  ] = useState<MafiaNightActionResult | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState<string | null>(
      null
    );

  const [error, setError] =
    useState<string | null>(
      null
    );

  async function refreshState() {
    if (!roomId) return;

    const fresh =
      await getMafiaNightState(
        roomId
      );

    setState(fresh);

    if (
      fresh.status === "day"
    ) {
      router.replace(
        `/mafia/day/${roomId}`
      );
    }
  }

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    async function load() {
      try {
        const fresh =
          await getMafiaNightState(
            roomId
          );

        if (cancelled) return;

        setState(fresh);

        if (
          fresh.status === "day"
        ) {
          router.replace(
            `/mafia/day/${roomId}`
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ??
              "Could not load night."
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
    router,
  ]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
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
            updated.status === "day"
          ) {
            router.replace(
              `/mafia/day/${roomId}`
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

  const eligibleTargets =
    useMemo(() => {
      if (!state) return [];

      if (state.my_role === "MAFIA") {
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
      submitting
    ) {
      return;
    }

    setSubmitting(playerId);
    setError(null);

    try {
      const result =
        await submitMafiaNightAction(
          roomId,
          playerId
        );

      setActionResult(result);

      if (
        result.night_resolved
      ) {
        router.replace(
          `/mafia/day/${roomId}`
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
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-white/50">
          {language === "hr"
            ? "Noć počinje..."
            : "Night is beginning..."}
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

  if (!state) {
    return null;
  }

  const hasAction =
    state.my_role !== "CIVILIAN" &&
    state.my_is_alive;

  const title =
    state.my_role === "MAFIA"
      ? language === "hr"
        ? "ODABERI ŽRTVU"
        : "CHOOSE A VICTIM"
      : state.my_role === "DOCTOR"
      ? language === "hr"
        ? "KOGA ŽELIŠ SPASITI?"
        : "WHO DO YOU WANT TO SAVE?"
      : state.my_role === "DETECTIVE"
      ? language === "hr"
        ? "KOGA ŽELIŠ ISTRAŽITI?"
        : "WHO DO YOU WANT TO INVESTIGATE?"
      : language === "hr"
      ? "SPAVAJ..."
      : "SLEEP...";

  const emoji =
    state.my_role === "MAFIA"
      ? "🔪"
      : state.my_role === "DOCTOR"
      ? "💉"
      : state.my_role === "DETECTIVE"
      ? "🔎"
      : "🌙";

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <div className="text-center pt-5">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          🌙{" "}
          {language === "hr"
            ? "NOĆ"
            : "NIGHT"}{" "}
          {state.day_number}
        </p>

        <div className="mt-5 text-6xl">
          {emoji}
        </div>

        <h1 className="mt-3 text-3xl font-black">
          {title}
        </h1>
      </div>

      {!state.my_is_alive ? (
        <div className="mt-auto mb-auto rounded-3xl border border-white/10 bg-panel2 p-7 text-center">
          <div className="text-6xl">
            👻
          </div>

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
        </div>
      ) : hasAction ? (
        <>
          <p className="text-center text-sm text-white/40">
            {state.my_role === "MAFIA"
              ? language === "hr"
                ? "Odaberi igrača kojeg Mafija želi ukloniti."
                : "Choose the player the Mafia wants to eliminate."
              : state.my_role === "DOCTOR"
              ? language === "hr"
                ? "Možeš spasiti bilo kojeg živog igrača, uključujući sebe."
                : "You may save any living player, including yourself."
              : language === "hr"
              ? "Rezultat istrage vidiš samo ti."
              : "Only you will see the investigation result."}
          </p>

          <section className="flex flex-col gap-3">
            {eligibleTargets.map(
              (player) => {
                const selected =
                  state.selected_target_player_id ===
                    player.id ||
                  actionResult?.target_player_id ===
                    player.id;

                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={
                      submitting !== null
                    }
                    onClick={() =>
                      handleAction(
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

          {state.my_role ===
            "DETECTIVE" &&
            actionResult?.action_type ===
              "INVESTIGATE" && (
              <div
                className={`rounded-3xl border p-6 text-center ${
                  actionResult.investigation_is_mafia
                    ? "border-red-400/30 bg-red-400/10"
                    : "border-green-400/30 bg-green-400/10"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                  {language === "hr"
                    ? "REZULTAT ISTRAGE"
                    : "INVESTIGATION RESULT"}
                </p>

                <p className="mt-3 text-2xl font-black">
                  {actionResult.investigation_is_mafia
                    ? language === "hr"
                      ? "🔪 OVAJ IGRAČ JE MAFIJA"
                      : "🔪 THIS PLAYER IS MAFIA"
                    : language === "hr"
                    ? "✅ OVAJ IGRAČ NIJE MAFIJA"
                    : "✅ THIS PLAYER IS NOT MAFIA"}
                </p>
              </div>
            )}

          {(state.selected_target_player_id ||
            actionResult) && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
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
            </div>
          )}
        </>
      ) : (
        <div className="mt-auto mb-auto rounded-3xl border border-white/10 bg-panel2 p-8 text-center">
          <div className="text-7xl">
            😴
          </div>

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
        </div>
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