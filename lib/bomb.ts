"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ensureAnonSession,
  generateRoomCode,
  supabase,
} from "@/lib/supabase";

export type BombStatus =
  | "waiting"
  | "playing"
  | "ended";

export interface BombRoom {
  id: string;
  code: string;
  host_user_id: string;

  status: BombStatus;

  starting_lives: number;
  timer_min_seconds: number;
  timer_max_seconds: number;

  current_round: number;

  current_category_id:
    | number
    | null;

  current_holder_player_id:
    | string
    | null;

  bomb_started_at:
    | string
    | null;

  bomb_explodes_at:
    | string
    | null;

  winner_player_id:
    | string
    | null;

  created_at: string;
  updated_at: string;
}

export interface BombPlayer {
  id: string;
  room_id: string;
  user_id: string;

  nickname: string;
  avatar: string;

  is_host: boolean;
  is_connected: boolean;

  lives: number;
  is_alive: boolean;

  joined_at: string;
}

export interface BombCategory {
  id: number;
  emoji: string;
  name_hr: string;
  name_en: string;
}

export interface BombUsedAnswer {
  answer: string;
  player_id: string;
}

export interface BombGameState {
  room_id: string;
  code: string;

  status: BombStatus;

  round_number: number;
  starting_lives: number;

  my_player_id: string;

  current_holder_player_id:
    | string
    | null;

  is_my_turn: boolean;

  category:
    | BombCategory
    | null;

  bomb_started_at:
    | string
    | null;

  bomb_explodes_at:
    | string
    | null;

  server_now: string;

  winner_player_id:
    | string
    | null;

  players: BombPlayer[];
  used_answers: BombUsedAnswer[];
}

export interface BombSubmitResult {
  status:
    | "passed"
    | "ended";

  answer?: string;

  from_player_id?: string;
  to_player_id?: string;

  bomb_explodes_at?: string;

  winner_player_id?: string;
}

export interface BombResolveResult {
  resolved: boolean;

  status:
    | "playing"
    | "ended"
    | "waiting";

  exploded_player_id?: string;

  exploded_player_lives?: number;

  winner_player_id?: string;

  next_round?: number;

  next_holder_player_id?: string;
}

export interface BombFinalPlayer {
  id: string;
  nickname: string;
  avatar: string;

  lives: number;
  is_alive: boolean;
  is_host: boolean;
}

export interface BombFinalResults {
  status: BombStatus;

  rounds_played: number;

  winner_player_id:
    | string
    | null;

  players: BombFinalPlayer[];
}

function storageKey(
  code: string
) {
  return `bomb_player_id_${code.toUpperCase()}`;
}

export function rememberBombPlayerId(
  code: string,
  playerId: string
) {
  try {
    localStorage.setItem(
      storageKey(code),
      playerId
    );
  } catch {}
}

export function getRememberedBombPlayerId(
  code: string
): string | null {
  try {
    return localStorage.getItem(
      storageKey(code)
    );
  } catch {
    return null;
  }
}

export async function createBombRoom(
  nickname: string,
  avatar: string
): Promise<string> {
  const userId =
    await ensureAnonSession();

  const code =
    generateRoomCode();

  const {
    data: room,
    error: roomError,
  } = await supabase
    .from("bomb_rooms")
    .insert({
      code,
      host_user_id: userId,
    })
    .select("*")
    .single();

  if (
    roomError ||
    !room
  ) {
    throw new Error(
      roomError?.message ??
        "Could not create Bomb room."
    );
  }

  const {
    data: player,
    error: playerError,
  } = await supabase
    .from("bomb_players")
    .insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      avatar,
      is_host: true,
      lives:
        room.starting_lives ??
        2,
      is_alive: true,
      is_connected: true,
    })
    .select("*")
    .single();

  if (
    playerError ||
    !player
  ) {
    throw new Error(
      playerError?.message ??
        "Could not create Bomb host player."
    );
  }

  rememberBombPlayerId(
    room.code,
    player.id
  );

  return room.code;
}

export async function joinBombRoom(
  codeInput: string,
  nickname: string,
  avatar: string
): Promise<string> {
  const userId =
    await ensureAnonSession();

  const code =
    codeInput
      .trim()
      .toUpperCase();

  const {
    data: room,
    error: roomError,
  } = await supabase
    .from("bomb_rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (roomError) {
    throw new Error(
      roomError.message
    );
  }

  if (!room) {
    throw new Error(
      "Bomb room not found."
    );
  }

  if (
    room.status !==
    "waiting"
  ) {
    throw new Error(
      "This Bomb game has already started."
    );
  }

  const { count } =
    await supabase
      .from("bomb_players")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "room_id",
        room.id
      );

  if ((count ?? 0) >= 12) {
    throw new Error(
      "This room is full (12 players max)."
    );
  }

  const {
    data: sameUser,
  } = await supabase
    .from("bomb_players")
    .select("*")
    .eq(
      "room_id",
      room.id
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (sameUser) {
    rememberBombPlayerId(
      room.code,
      sameUser.id
    );

    return room.code;
  }

  const {
    data: player,
    error: playerError,
  } = await supabase
    .from("bomb_players")
    .insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      avatar,
      is_host: false,
      lives:
        room.starting_lives ??
        2,
      is_alive: true,
      is_connected: true,
    })
    .select("*")
    .single();

  if (
    playerError ||
    !player
  ) {
    throw new Error(
      playerError?.message ??
        "Could not join Bomb room."
    );
  }

  rememberBombPlayerId(
    room.code,
    player.id
  );

  return room.code;
}

export async function getBombRoomById(
  roomId: string
): Promise<BombRoom | null> {
  const {
    data,
    error,
  } = await supabase
    .from("bomb_rooms")
    .select("*")
    .eq(
      "id",
      roomId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as
    | BombRoom
    | null;
}

export async function getMyBombPlayerInRoom(
  roomId: string
): Promise<BombPlayer | null> {
  const userId =
    await ensureAnonSession();

  const {
    data,
    error,
  } = await supabase
    .from("bomb_players")
    .select("*")
    .eq(
      "room_id",
      roomId
    )
    .eq(
      "user_id",
      userId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as
    | BombPlayer
    | null;
}

export async function startBombGame(
  roomId: string
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "start_bomb_game",
    {
      p_room_id: roomId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data;
}

export async function getBombGameState(
  roomId: string
): Promise<BombGameState> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_bomb_game_state",
    {
      p_room_id: roomId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as BombGameState;
}

export async function submitBombAnswer(
  roomId: string,
  answer: string
): Promise<BombSubmitResult> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "submit_bomb_answer",
    {
      p_room_id: roomId,
      p_answer: answer,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as BombSubmitResult;
}

export async function resolveBombIfDue(
  roomId: string
): Promise<BombResolveResult> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "resolve_bomb_if_due",
    {
      p_room_id: roomId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as BombResolveResult;
}

export async function getBombFinalResults(
  roomId: string
): Promise<BombFinalResults> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_bomb_final_results",
    {
      p_room_id: roomId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as BombFinalResults;
}

export async function rematchBombGame(
  roomId: string
) {
  const {
    error,
  } = await supabase.rpc(
    "rematch_bomb_game",
    {
      p_room_id: roomId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export async function updateBombSettings(
  roomId: string,
  patch: Partial<
    Pick<
      BombRoom,
      | "starting_lives"
      | "timer_min_seconds"
      | "timer_max_seconds"
    >
  >
) {
  const {
    error,
  } = await supabase
    .from("bomb_rooms")
    .update(patch)
    .eq(
      "id",
      roomId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export async function kickBombPlayer(
  roomId: string,
  playerId: string
) {
  const {
    error,
  } = await supabase.rpc(
    "bomb_kick_player",
    {
      p_room_id: roomId,
      p_player_id:
        playerId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export function useBombRoomRealtime(
  code: string
) {
  const [
    room,
    setRoom,
  ] =
    useState<BombRoom | null>(
      null
    );

  const [
    players,
    setPlayers,
  ] =
    useState<BombPlayer[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const refetchPlayers =
    useCallback(
      async (
        roomId: string
      ) => {
        const {
          data,
          error,
        } = await supabase
          .from(
            "bomb_players"
          )
          .select("*")
          .eq(
            "room_id",
            roomId
          )
          .order(
            "joined_at",
            {
              ascending:
                true,
            }
          );

        if (error) {
          console.error(
            error
          );

          return;
        }

        setPlayers(
          (data ??
            []) as BombPlayer[]
        );
      },
      []
    );

  useEffect(() => {
    if (!code) {
      return;
    }

    let cancelled = false;

    let roomChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    let playersChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    async function init() {
      setLoading(true);
      setError(null);

      await ensureAnonSession();

      const {
        data: roomData,
        error: roomError,
      } = await supabase
        .from("bomb_rooms")
        .select("*")
        .eq(
          "code",
          code.toUpperCase()
        )
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        roomError ||
        !roomData
      ) {
        setError(
          roomError?.message ??
            "Room not found."
        );

        setLoading(false);

        return;
      }

      setRoom(
        roomData as BombRoom
      );

      await refetchPlayers(
        roomData.id
      );

      setLoading(false);

      roomChannel =
        supabase
          .channel(
            `bomb-room-${roomData.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema:
                "public",
              table:
                "bomb_rooms",
              filter:
                `id=eq.${roomData.id}`,
            },
            (
              payload
            ) => {
              setRoom(
                payload.new as BombRoom
              );
            }
          )
          .subscribe();

      playersChannel =
        supabase
          .channel(
            `bomb-players-${roomData.id}`
          )
          .on(
            "postgres_changes",
            {
              event:
                "INSERT",
              schema:
                "public",
              table:
                "bomb_players",
              filter:
                `room_id=eq.${roomData.id}`,
            },
            () => {
              void refetchPlayers(
                roomData.id
              );
            }
          )
          .on(
            "postgres_changes",
            {
              event:
                "UPDATE",
              schema:
                "public",
              table:
                "bomb_players",
              filter:
                `room_id=eq.${roomData.id}`,
            },
            () => {
              void refetchPlayers(
                roomData.id
              );
            }
          )
          .on(
            "postgres_changes",
            {
              event:
                "DELETE",
              schema:
                "public",
              table:
                "bomb_players",
            },
            (
              payload
            ) => {
              const deletedId =
                (
                  payload.old as
                    | {
                        id?: string;
                      }
                    | null
                )?.id;

              if (
                deletedId
              ) {
                setPlayers(
                  (
                    current
                  ) =>
                    current.filter(
                      (
                        player
                      ) =>
                        player.id !==
                        deletedId
                    )
                );
              }

              void refetchPlayers(
                roomData.id
              );
            }
          )
          .subscribe();
    }

    void init();

    return () => {
      cancelled = true;

      if (
        roomChannel
      ) {
        void supabase.removeChannel(
          roomChannel
        );
      }

      if (
        playersChannel
      ) {
        void supabase.removeChannel(
          playersChannel
        );
      }
    };
  }, [
    code,
    refetchPlayers,
  ]);

  return {
    room,
    players,
    loading,
    error,
  };
}