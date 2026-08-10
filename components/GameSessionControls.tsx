"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { playSound } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

import {
  endGameToLobby,
  getMyPlayerInRoom,
  getRoomById,
  leaveGame,
} from "@/lib/useRoom";

import type {
  Player,
  Room,
} from "@/lib/types";

const GAME_ROUTES = new Set([
  "question",
  "answer",
  "voting",
  "reveal",
]);

export default function GameSessionControls() {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();

  const routeInfo = useMemo(() => {
    const parts = pathname
      .split("/")
      .filter(Boolean);

    if (
      parts.length !== 2 ||
      !GAME_ROUTES.has(parts[0])
    ) {
      return null;
    }

    return {
      roomId: decodeURIComponent(
        parts[1]
      ),
    };
  }, [pathname]);

  const roomId =
    routeInfo?.roomId ?? "";

  const [room, setRoom] =
    useState<Room | null>(null);

  const [me, setMe] =
    useState<Player | null>(null);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [ending, setEnding] =
    useState(false);

  const [leaving, setLeaving] =
    useState(false);

  const [actionError, setActionError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setMe(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [
          freshRoom,
          freshMe,
        ] = await Promise.all([
          getRoomById(roomId),
          getMyPlayerInRoom(roomId),
        ]);

        if (cancelled) return;

        setRoom(freshRoom);
        setMe(freshMe);
      } catch (error) {
        console.error(
          "Could not load game controls:",
          error
        );
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
        `game-controls-${roomId}`
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom(
            payload.new as Room
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [roomId]);

  // When a match is cancelled, every remaining player returns
  // to the SAME lobby automatically.
  useEffect(() => {
    if (
      !routeInfo ||
      !room ||
      room.status !== "waiting"
    ) {
      return;
    }

    router.replace(
      `/room/${room.code}`
    );
  }, [
    routeInfo,
    room,
    router,
  ]);

  if (
    !routeInfo ||
    !room ||
    !me
  ) {
    return null;
  }

  async function handleEndGame() {
    if (ending || leaving) return;

    const confirmed =
      window.confirm(
        language === "hr"
          ? "Prekinuti trenutnu igru i vratiti sve u lobby?"
          : "End the current game and return everyone to the lobby?"
      );

    if (!confirmed) return;

    playSound("click");

    setEnding(true);
    setActionError(null);

    try {
      await endGameToLobby(
        room!.id
      );
    } catch (error: any) {
      console.error(
        "End game failed:",
        error
      );

      setActionError(
        error?.message ??
          (language === "hr"
            ? "Nije moguće vratiti igru u lobby."
            : "Could not return the game to the lobby.")
      );

      setEnding(false);
    }
  }

  async function handleLeaveGame() {
    if (leaving || ending) return;

    const confirmed =
      window.confirm(
        language === "hr"
          ? "Želiš izaći iz igre? Ostali igrači će se vratiti u lobby."
          : "Leave the game? The remaining players will return to the lobby."
      );

    if (!confirmed) return;

    playSound("click");

    setLeaving(true);
    setActionError(null);

    try {
      await leaveGame(
        room!.id
      );

      router.replace("/");
    } catch (error: any) {
      console.error(
        "Leave game failed:",
        error
      );

      setActionError(
        error?.message ??
          (language === "hr"
            ? "Nije moguće izaći iz igre."
            : "Could not leave the game.")
      );

      setLeaving(false);
    }
  }

  return (
    <div
      className="
        fixed
        top-[calc(env(safe-area-inset-top)+8px)]
        right-[125px]
        z-[100]
      "
    >
      {me.is_host ? (
        <>
          <button
            type="button"
            onClick={() => {
              playSound("click");

              setMenuOpen(
                (current) =>
                  !current
              );
            }}
            className="
              rounded-xl
              border
              border-white/10
              bg-black/70
              px-3
              py-2
              text-xs
              font-black
              text-white
              shadow-lg
              backdrop-blur-md
              transition
              active:scale-95
            "
          >
            ⚙️ HOST
          </button>

          {menuOpen && (
            <div
              className="
                absolute
                right-0
                mt-2
                w-64
                rounded-2xl
                border
                border-white/10
                bg-[#14141f]/95
                p-4
                shadow-2xl
                backdrop-blur-xl
              "
            >
              <p className="text-xs uppercase tracking-widest text-white/30">
                {language === "hr"
                  ? "HOST KONTROLE"
                  : "HOST CONTROLS"}
              </p>

              <p className="mt-3 text-sm leading-relaxed text-white/60">
                {language === "hr"
                  ? "Vrati sve u lobby ako je netko AFK ili želiš prekinuti trenutnu igru."
                  : "Return everyone to the lobby if someone is AFK or you want to cancel the current game."}
              </p>

              <button
                type="button"
                disabled={ending}
                onClick={
                  handleEndGame
                }
                className="
                  mt-4
                  w-full
                  rounded-xl
                  border
                  border-red-500/30
                  bg-red-500/10
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-red-300
                  transition
                  active:scale-95
                  disabled:opacity-40
                "
              >
                {ending
                  ? language === "hr"
                    ? "VRAĆANJE..."
                    : "RETURNING..."
                  : language === "hr"
                  ? "⛔ PREKINI IGRU"
                  : "⛔ END GAME"}
              </button>

              {actionError && (
                <p className="mt-3 text-xs text-red-300">
                  {actionError}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={leaving}
            onClick={
              handleLeaveGame
            }
            className="
              rounded-xl
              border
              border-red-500/20
              bg-black/70
              px-3
              py-2
              text-xs
              font-black
              text-red-300
              shadow-lg
              backdrop-blur-md
              transition
              active:scale-95
              disabled:opacity-40
            "
          >
            {leaving
              ? "..."
              : language === "hr"
              ? "🚪 IZAĐI"
              : "🚪 LEAVE"}
          </button>

          {actionError && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-red-500/20 bg-[#14141f]/95 p-3 text-xs text-red-300 shadow-xl">
              {actionError}
            </div>
          )}
        </>
      )}
    </div>
  );
}