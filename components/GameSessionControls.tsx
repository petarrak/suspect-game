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

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type GameType =
  | "suspect"
  | "liar"
  | "mafia"
  | "who-would";

type SessionInfo = {
  game: GameType;
  roomId: string;
  roomTable: string;
  lobbyPrefix: string;
};

function getSessionInfo(
  pathname: string
): SessionInfo | null {
  const parts = pathname
    .split("/")
    .filter(Boolean);

  // =========================
  // SUSPECT ACTIVE GAME
  // =========================
  if (
    parts.length === 2 &&
    [
      "question",
      "answer",
      "voting",
      "reveal",
    ].includes(parts[0])
  ) {
    return {
      game: "suspect",
      roomId: parts[1],
      roomTable: "rooms",
      lobbyPrefix: "/room",
    };
  }

  // =========================
  // LIAR ACTIVE GAME
  // =========================
  if (
    parts.length === 3 &&
    parts[0] === "liar" &&
    [
      "word",
      "discussion",
      "voting",
      "reveal",
      "results",
    ].includes(parts[1])
  ) {
    return {
      game: "liar",
      roomId: parts[2],
      roomTable: "liar_rooms",
      lobbyPrefix: "/liar/room",
    };
  }

  // =========================
  // MAFIA ACTIVE GAME
  // =========================
  if (
    parts.length === 3 &&
    parts[0] === "mafia" &&
    [
      "role",
      "night",
      "day",
      "discussion",
      "voting",
      "reveal",
      "results",
    ].includes(parts[1])
  ) {
    return {
      game: "mafia",
      roomId: parts[2],
      roomTable: "mafia_rooms",
      lobbyPrefix: "/mafia/room",
    };
  }

  // =========================
  // WHO WOULD ACTIVE GAME
  // =========================
  if (
    parts.length === 3 &&
    parts[0] === "who-would" &&
    [
      "question",
      "voting",
      "reveal",
      "results",
    ].includes(parts[1])
  ) {
    return {
      game: "who-would",
      roomId: parts[2],
      roomTable: "who_would_rooms",
      lobbyPrefix: "/who-would/room",
    };
  }

  return null;
}

function isLobbyPage(
  pathname: string
) {
  const parts = pathname
    .split("/")
    .filter(Boolean);

  // SUSPECT
  // /room/ABC123
  if (
    parts.length === 2 &&
    parts[0] === "room"
  ) {
    return true;
  }

  // LIAR
  // /liar/room/ABC123
  if (
    parts.length === 3 &&
    parts[0] === "liar" &&
    parts[1] === "room"
  ) {
    return true;
  }

  // MAFIA
  // /mafia/room/ABC123
  if (
    parts.length === 3 &&
    parts[0] === "mafia" &&
    parts[1] === "room"
  ) {
    return true;
  }

  // WHO WOULD
  // /who-would/room/ABC123
  if (
    parts.length === 3 &&
    parts[0] === "who-would" &&
    parts[1] === "room"
  ) {
    return true;
  }

  return false;
}

export default function GameSessionControls() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const { language } =
    useLanguage();

  const session = useMemo(
    () =>
      getSessionInfo(
        pathname ?? ""
      ),
    [pathname]
  );

  const lobbyPage = useMemo(
    () =>
      isLobbyPage(
        pathname ?? ""
      ),
    [pathname]
  );

  const [isHost, setIsHost] =
    useState(false);

  const [roomCode, setRoomCode] =
    useState<string | null>(
      null
    );

  const [open, setOpen] =
    useState(false);

  const [returning, setReturning] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  // =========================
  // ACTIVE GAME SESSION
  // =========================

  useEffect(() => {
    setIsHost(false);
    setRoomCode(null);
    setOpen(false);
    setError(null);
    setReturning(false);

    if (!session) {
      return;
    }

    const activeSession =
      session;

    let cancelled = false;

    async function load() {
      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const userId =
        authData.user?.id;

      if (
        cancelled ||
        !userId
      ) {
        return;
      }

      const {
        data: room,
        error: roomError,
      } = await supabase
        .from(
          activeSession.roomTable
        )
        .select(
          "id, code, status, host_user_id"
        )
        .eq(
          "id",
          activeSession.roomId
        )
        .maybeSingle();

      if (
        cancelled ||
        roomError ||
        !room
      ) {
        return;
      }

      setRoomCode(
        room.code as string
      );

      setIsHost(
        room.host_user_id ===
          userId
      );

      // Ako je igra već vraćena u lobby,
      // odmah prebaci i ovaj uređaj.
      if (
        room.status ===
        "waiting"
      ) {
        setReturning(false);

        router.replace(
          `${activeSession.lobbyPrefix}/${room.code}`
        );
      }
    }

    void load();

    const channel =
      supabase
        .channel(
          `global-session-${activeSession.game}-${activeSession.roomId}`
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              activeSession.roomTable,
            filter:
              `id=eq.${activeSession.roomId}`,
          },
          (payload) => {
            const updated =
              payload.new as {
                code?: string;
                status?: string;
                host_user_id?: string;
              };

            if (
              updated.code
            ) {
              setRoomCode(
                updated.code
              );
            }

            if (
              updated.status ===
                "waiting" &&
              updated.code
            ) {
              setReturning(false);

              router.replace(
                `${activeSession.lobbyPrefix}/${updated.code}`
              );
            }
          }
        )
        .subscribe();

    return () => {
      cancelled = true;

      void supabase.removeChannel(
        channel
      );
    };
  }, [
    session,
    router,
  ]);

  // =========================
  // HOST RETURN TO LOBBY
  // =========================

  async function handleReturnToLobby() {
    if (
      !session ||
      !isHost ||
      returning
    ) {
      return;
    }

    const activeSession =
      session;

    const confirmed =
      window.confirm(
        language === "hr"
          ? "Vratiti SVE igrače u lobby? Trenutna partija će se resetirati."
          : "Return ALL players to the lobby? The current game will be reset."
      );

    if (!confirmed) {
      return;
    }

    setReturning(true);
    setError(null);

    try {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "party_host_return_to_lobby",
        {
          p_game:
            activeSession.game,
          p_room_id:
            activeSession.roomId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      const code =
        (data as string | null) ??
        roomCode;

      setReturning(false);

      if (code) {
        router.replace(
          `${activeSession.lobbyPrefix}/${code}`
        );
      }
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće vratiti igru u lobby."
            : "Could not return the game to the lobby.")
      );

      setReturning(false);
    }
  }

  return (
    <>
      {/* =====================
          HOME BUTTON
          samo u lobbyju
      ====================== */}

      {lobbyPage && (
        <button
          type="button"
          onClick={() =>
            router.push("/")
          }
          className="fixed left-4 top-4 z-[100] flex h-11 items-center gap-2 rounded-full border border-white/15 bg-black/70 px-4 text-xs font-black text-white shadow-xl backdrop-blur-md transition hover:border-accent/40 hover:bg-white/10"
        >
          🏠{" "}
          {language === "hr"
            ? "POČETNA"
            : "HOME"}
        </button>
      )}

      {/* =====================
          HOST BUTTON
          samo host tijekom igre
      ====================== */}

      {session &&
        isHost && (
          <button
            type="button"
            onClick={() =>
              setOpen(
                (value) =>
                  !value
              )
            }
            className="fixed right-24 top-4 z-[100] flex h-11 items-center gap-2 rounded-full border border-white/15 bg-black/70 px-4 text-xs font-black text-white shadow-xl backdrop-blur-md transition hover:border-accent/40 hover:bg-white/10"
          >
            👑 HOST
          </button>
        )}

      {/* =====================
          HOST MENU
      ====================== */}

      {session &&
        isHost &&
        open && (
          <div className="fixed right-4 top-16 z-[100] w-[min(21rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-[#15121f]/95 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
                  👑{" "}
                  {language ===
                  "hr"
                    ? "HOST MENI"
                    : "HOST MENU"}
                </p>

                <p className="mt-1 text-xs text-white/40">
                  {language ===
                  "hr"
                    ? "Kontrole za slučaj AFK igrača ili zaglavljene runde."
                    : "Controls for AFK players or a stuck round."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                className="text-xl text-white/40 transition hover:text-white"
              >
                ×
              </button>
            </div>

            <button
              type="button"
              onClick={
                handleReturnToLobby
              }
              disabled={
                returning
              }
              className="mt-4 w-full rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-4 text-left transition hover:bg-red-400/15 disabled:opacity-50"
            >
              <p className="font-black text-red-300">
                ↩{" "}
                {returning
                  ? language ===
                    "hr"
                    ? "VRAĆAM U LOBBY..."
                    : "RETURNING..."
                  : language ===
                    "hr"
                  ? "VRATI SVE U LOBBY"
                  : "RETURN ALL TO LOBBY"}
              </p>

              <p className="mt-1 text-xs text-white/40">
                {language ===
                "hr"
                  ? "Resetira trenutnu partiju, ali svi igrači ostaju u istoj sobi."
                  : "Resets the current game while keeping everyone in the same room."}
              </p>
            </button>

            {error && (
              <p className="mt-3 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>
        )}
    </>
  );
}