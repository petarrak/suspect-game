"use client";

import {
  useCallback,
  useEffect,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

type GameType =
  | "suspect"
  | "liar"
  | "mafia"
  | "who-would";

type GameConfig = {
  game: GameType;
  roomTable: string;
  playerTable: string;
  lobbyPrefix: string;
};

type RouteSession = {
  config: GameConfig;
  roomId?: string;
  code?: string;
};

const CONFIGS: Record<
  GameType,
  GameConfig
> = {
  suspect: {
    game: "suspect",
    roomTable: "rooms",
    playerTable: "players",
    lobbyPrefix: "/room",
  },

  liar: {
    game: "liar",
    roomTable: "liar_rooms",
    playerTable: "liar_players",
    lobbyPrefix: "/liar/room",
  },

  mafia: {
    game: "mafia",
    roomTable: "mafia_rooms",
    playerTable: "mafia_players",
    lobbyPrefix: "/mafia/room",
  },

  "who-would": {
    game: "who-would",
    roomTable: "who_would_rooms",
    playerTable: "who_would_players",
    lobbyPrefix: "/who-would/room",
  },
};

function parseRoute(
  pathname: string
): RouteSession | null {
  const parts = pathname
    .split("/")
    .filter(Boolean);

  // =========================
  // SUSPECT LOBBY
  // /room/CODE
  // =========================
  if (
    parts.length === 2 &&
    parts[0] === "room"
  ) {
    return {
      config: CONFIGS.suspect,
      code: parts[1].toUpperCase(),
    };
  }

  // =========================
  // SUSPECT ACTIVE GAME
  // /question/[roomId]
  // /answer/[roomId]
  // /voting/[roomId]
  // /reveal/[roomId]
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
      config: CONFIGS.suspect,
      roomId: parts[1],
    };
  }

  // =========================
  // LIAR
  // =========================
  if (
    parts.length === 3 &&
    parts[0] === "liar"
  ) {
    if (
      parts[1] === "room"
    ) {
      return {
        config: CONFIGS.liar,
        code:
          parts[2].toUpperCase(),
      };
    }

    if (
      [
        "word",
        "discussion",
        "voting",
        "reveal",
        "results",
      ].includes(parts[1])
    ) {
      return {
        config: CONFIGS.liar,
        roomId: parts[2],
      };
    }
  }

  // =========================
  // MAFIA
  // =========================
  if (
    parts.length === 3 &&
    parts[0] === "mafia"
  ) {
    if (
      parts[1] === "room"
    ) {
      return {
        config: CONFIGS.mafia,
        code:
          parts[2].toUpperCase(),
      };
    }

    if (
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
        config: CONFIGS.mafia,
        roomId: parts[2],
      };
    }
  }

  // =========================
  // WHO WOULD?
  // =========================
  if (
    parts.length === 3 &&
    parts[0] === "who-would"
  ) {
    if (
      parts[1] === "room"
    ) {
      return {
        config:
          CONFIGS["who-would"],
        code:
          parts[2].toUpperCase(),
      };
    }

    if (
      [
        "question",
        "voting",
        "reveal",
        "results",
      ].includes(parts[1])
    ) {
      return {
        config:
          CONFIGS["who-would"],
        roomId: parts[2],
      };
    }
  }

  return null;
}

function getTargetPath(
  game: GameType,
  status: string,
  roomId: string,
  code: string
): string | null {
  // =========================
  // SUSPECT
  // =========================
  if (game === "suspect") {
    if (status === "waiting") {
      return `/room/${code}`;
    }

    if (status === "question") {
      return `/question/${roomId}`;
    }

    if (
      status === "answering"
    ) {
      return `/answer/${roomId}`;
    }

    if (status === "voting") {
      return `/voting/${roomId}`;
    }

    if (status === "reveal") {
      return `/reveal/${roomId}`;
    }

    return null;
  }

  // =========================
  // LIAR
  // =========================
  if (game === "liar") {
    if (status === "waiting") {
      return `/liar/room/${code}`;
    }

    if (status === "word") {
      return `/liar/word/${roomId}`;
    }

    if (
      status === "discussion"
    ) {
      return `/liar/discussion/${roomId}`;
    }

    if (status === "voting") {
      return `/liar/voting/${roomId}`;
    }

    if (status === "reveal") {
      return `/liar/reveal/${roomId}`;
    }

    if (status === "ended") {
      return `/liar/results/${roomId}`;
    }

    return null;
  }

  // =========================
  // MAFIA
  // =========================
  if (game === "mafia") {
    if (status === "waiting") {
      return `/mafia/room/${code}`;
    }

    if (status === "role") {
      return `/mafia/role/${roomId}`;
    }

    if (status === "night") {
      return `/mafia/night/${roomId}`;
    }

    if (status === "day") {
      return `/mafia/day/${roomId}`;
    }

    if (
      status === "discussion"
    ) {
      return `/mafia/discussion/${roomId}`;
    }

    if (status === "voting") {
      return `/mafia/voting/${roomId}`;
    }

    if (status === "reveal") {
      return `/mafia/reveal/${roomId}`;
    }

    if (status === "ended") {
      return `/mafia/results/${roomId}`;
    }

    return null;
  }

  // =========================
  // WHO WOULD?
  // =========================
  if (
    game === "who-would"
  ) {
    if (status === "waiting") {
      return `/who-would/room/${code}`;
    }

    if (status === "question") {
      return `/who-would/question/${roomId}`;
    }

    if (status === "voting") {
      return `/who-would/voting/${roomId}`;
    }

    if (status === "reveal") {
      return `/who-would/reveal/${roomId}`;
    }

    if (status === "ended") {
      return `/who-would/results/${roomId}`;
    }

    return null;
  }

  return null;
}

export default function ReconnectGuard() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const syncSession =
    useCallback(async () => {
      const currentPath =
        pathname ?? "";

      const route =
        parseRoute(currentPath);

      if (!route) {
        return;
      }

      // Do nothing while completely offline.
      if (
        typeof navigator !==
          "undefined" &&
        !navigator.onLine
      ) {
        return;
      }

      try {
        const {
          data: authData,
        } =
          await supabase.auth.getUser();

        const userId =
          authData.user?.id;

        if (!userId) {
          return;
        }

        let roomQuery =
          supabase
            .from(
              route.config.roomTable
            )
            .select(
              "id, code, status"
            );

        if (route.roomId) {
          roomQuery =
            roomQuery.eq(
              "id",
              route.roomId
            );
        } else if (route.code) {
          roomQuery =
            roomQuery.eq(
              "code",
              route.code
            );
        } else {
          return;
        }

        const {
          data: room,
          error: roomError,
        } =
          await roomQuery.maybeSingle();

        if (
          roomError ||
          !room
        ) {
          return;
        }

        // Make sure this browser/user is actually
        // still a member of the room.
        const {
          data: player,
          error: playerError,
        } =
          await supabase
            .from(
              route.config.playerTable
            )
            .select("id")
            .eq(
              "room_id",
              room.id
            )
            .eq(
              "user_id",
              userId
            )
            .maybeSingle();

        if (
          playerError ||
          !player
        ) {
          return;
        }

        const target =
          getTargetPath(
            route.config.game,
            room.status,
            room.id,
            room.code
          );

        if (
          target &&
          target !== currentPath
        ) {
          router.replace(target);
        }
      } catch (error) {
        // Network hiccups should never crash the app.
        console.warn(
          "Reconnect sync failed:",
          error
        );
      }
    }, [
      pathname,
      router,
    ]);

  useEffect(() => {
    void syncSession();

    function handleOnline() {
      void syncSession();
      router.refresh();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void syncSession();
      }
    }

    window.addEventListener(
      "online",
      handleOnline
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [
    syncSession,
    router,
  ]);

  return null;
}