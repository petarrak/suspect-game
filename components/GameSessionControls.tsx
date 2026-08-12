"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";

type GameType =
  | "suspect"
  | "liar"
  | "mafia"
  | "who-would"
  | "bomb"
  | "truth-or-dare"
  | "chaos-cards";

type SessionInfo = {
  game: GameType;
  roomId: string;
  roomTable: string;
  lobbyPrefix: string;
};

function getSessionInfo(pathname: string): SessionInfo | null {
  const parts = pathname.split("/").filter(Boolean);

  if (
    parts.length === 2 &&
    ["question", "answer", "voting", "reveal"].includes(parts[0])
  ) {
    return {
      game: "suspect",
      roomId: parts[1],
      roomTable: "rooms",
      lobbyPrefix: "/room",
    };
  }

  if (
    parts.length === 3 &&
    parts[0] === "liar" &&
    ["word", "discussion", "voting", "reveal", "results"].includes(parts[1])
  ) {
    return {
      game: "liar",
      roomId: parts[2],
      roomTable: "liar_rooms",
      lobbyPrefix: "/liar/room",
    };
  }

  if (
    parts.length === 3 &&
    parts[0] === "mafia" &&
    ["role", "night", "day", "discussion", "voting", "reveal", "results"].includes(parts[1])
  ) {
    return {
      game: "mafia",
      roomId: parts[2],
      roomTable: "mafia_rooms",
      lobbyPrefix: "/mafia/room",
    };
  }

  if (
    parts.length === 3 &&
    parts[0] === "who-would" &&
    ["question", "voting", "reveal", "results"].includes(parts[1])
  ) {
    return {
      game: "who-would",
      roomId: parts[2],
      roomTable: "who_would_rooms",
      lobbyPrefix: "/who-would/room",
    };
  }

  if (
    parts.length === 3 &&
    parts[0] === "bomb" &&
    ["game", "results"].includes(parts[1])
  ) {
    return {
      game: "bomb",
      roomId: parts[2],
      roomTable: "bomb_rooms",
      lobbyPrefix: "/bomb/room",
    };
  }

  if (
    parts.length === 3 &&
    parts[0] === "truth-or-dare" &&
    parts[1] === "game"
  ) {
    return {
      game: "truth-or-dare",
      roomId: parts[2],
      roomTable: "truth_dare_rooms",
      lobbyPrefix: "/truth-or-dare/room",
    };
  }

  if (
    parts.length === 3 &&
    parts[0] === "chaos-cards" &&
    parts[1] === "game"
  ) {
    return {
      game: "chaos-cards",
      roomId: parts[2],
      roomTable: "chaos_card_rooms",
      lobbyPrefix: "/chaos-cards/room",
    };
  }

  return null;
}

function isLobbyPage(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 2 && parts[0] === "room") return true;

  return (
    parts.length === 3 &&
    [
      "liar",
      "mafia",
      "who-would",
      "bomb",
      "truth-or-dare",
      "chaos-cards",
    ].includes(parts[0]) &&
    parts[1] === "room"
  );
}

export default function GameSessionControls() {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();

  const session = useMemo(
    () => getSessionInfo(pathname ?? ""),
    [pathname]
  );
  const lobbyPage = useMemo(
    () => isLobbyPage(pathname ?? ""),
    [pathname]
  );

  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [returning, setReturning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hostTop = "calc(env(safe-area-inset-top, 0px) + 4.25rem)";
  const menuTop = "calc(env(safe-area-inset-top, 0px) + 7.75rem)";

  useEffect(() => {
    setIsHost(false);
    setRoomCode(null);
    setOpen(false);
    setError(null);
    setReturning(false);

    if (!session) return;
    const activeSession = session;
    let cancelled = false;

    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (cancelled || !userId) return;

      const { data: room, error: roomError } = await supabase
        .from(activeSession.roomTable)
        .select("id, code, status, host_user_id")
        .eq("id", activeSession.roomId)
        .maybeSingle();

      if (cancelled || roomError || !room) return;
      setRoomCode(room.code as string);
      setIsHost(room.host_user_id === userId);

      if (room.status === "waiting") {
        router.replace(`${activeSession.lobbyPrefix}/${room.code}`);
      }
    }

    void load();

    const channel = supabase
      .channel(`global-session-${activeSession.game}-${activeSession.roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: activeSession.roomTable,
          filter: `id=eq.${activeSession.roomId}`,
        },
        (payload) => {
          const updated = payload.new as { code?: string; status?: string };
          if (updated.code) setRoomCode(updated.code);
          if (updated.status === "waiting" && updated.code) {
            setReturning(false);
            router.replace(`${activeSession.lobbyPrefix}/${updated.code}`);
          }
        }
      )
      .subscribe();

    const interval = window.setInterval(load, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [session, router]);

  async function handleReturnToLobby() {
    if (!session || !isHost || returning) return;

    const confirmed = window.confirm(
      language === "hr"
        ? "Vratiti SVE igrače u lobby? Trenutna partija će se resetirati."
        : "Return ALL players to the lobby? The current game will be reset."
    );
    if (!confirmed) return;

    setReturning(true);
    setError(null);

    try {
      let data: unknown = null;
      let rpcError: { message?: string } | null = null;

      if (session.game === "truth-or-dare") {
        const result = await supabase.rpc("restart_truth_dare_game", {
          p_room_id: session.roomId,
        });
        data = result.data;
        rpcError = result.error;
      } else if (session.game === "chaos-cards") {
        const result = await supabase.rpc("restart_chaos_cards_game", {
          p_room_id: session.roomId,
        });
        data = result.data;
        rpcError = result.error;
      } else {
        const result = await supabase.rpc("party_host_return_to_lobby", {
          p_game: session.game,
          p_room_id: session.roomId,
        });
        data = result.data;
        rpcError = result.error;
      }

      if (rpcError) throw rpcError;

      const resultCode =
        typeof data === "string"
          ? data
          : (data as { code?: string } | null)?.code ?? roomCode;

      if (resultCode) {
        router.replace(`${session.lobbyPrefix}/${resultCode}`);
      }
    } catch (e: any) {
      setError(
        e?.message ??
          (language === "hr"
            ? "Nije moguće vratiti igru u lobby."
            : "Could not return the game to the lobby.")
      );
    } finally {
      setReturning(false);
    }
  }

  function goHome() {
    if (
      session &&
      !window.confirm(
        language === "hr"
          ? "Napustiti trenutnu igru i vratiti se na početnu?"
          : "Leave the current game and return home?"
      )
    ) {
      return;
    }
    router.push("/");
  }

  return (
    <>
      {(lobbyPage || session) && (
        <button
          type="button"
          onClick={goHome}
          className="fixed left-4 top-4 z-[100] flex h-11 items-center gap-2 rounded-full border border-white/15 bg-black/70 px-4 text-xs font-black text-white shadow-xl backdrop-blur-md transition hover:border-accent/40 hover:bg-white/10"
        >
          🏠 {language === "hr" ? "POČETNA" : "HOME"}
        </button>
      )}

      {session && isHost && (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          style={{ top: hostTop }}
          className="fixed right-4 z-[100] flex h-11 items-center gap-2 rounded-full border border-white/15 bg-black/70 px-4 text-xs font-black text-white shadow-xl backdrop-blur-md transition hover:border-accent/40 hover:bg-white/10"
        >
          👑 HOST
        </button>
      )}

      {session && isHost && open && (
        <div
          style={{ top: menuTop }}
          className="fixed right-4 z-[100] w-[min(21rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-[#15121f]/95 p-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
                👑 {language === "hr" ? "HOST MENI" : "HOST MENU"}
              </p>
              <p className="mt-1 text-xs text-white/40">
                {language === "hr"
                  ? "Kontrole za zaglavljenu partiju ili povratak u sobu."
                  : "Controls for a stuck game or returning to the room."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xl text-white/40 transition hover:text-white"
            >
              ×
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleReturnToLobby()}
            disabled={returning}
            className="mt-4 w-full rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-4 text-left transition hover:bg-red-400/15 disabled:opacity-50"
          >
            <p className="font-black text-red-300">
              ↩ {returning
                ? language === "hr"
                  ? "VRAĆAM U LOBBY..."
                  : "RETURNING..."
                : language === "hr"
                ? "VRATI SVE U LOBBY"
                : "RETURN ALL TO LOBBY"}
            </p>
            <p className="mt-1 text-xs text-white/40">
              {language === "hr"
                ? "Resetira partiju, ali svi igrači ostaju u istoj sobi."
                : "Resets the game while keeping everyone in the same room."}
            </p>
          </button>

          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </div>
      )}
    </>
  );
}