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

export type WhoWouldCategory =
  | "FUNNY"
  | "PARTY"
  | "FRIENDS"
  | "EMBARRASSING"
  | "DATING"
  | "CHAOS"
  | "RANDOM";

export type WhoWouldStatus =
  | "waiting"
  | "question"
  | "voting"
  | "reveal"
  | "ended";

export interface WhoWouldRoom {
  id: string;
  code: string;
  status: WhoWouldStatus;
  host_user_id: string;

  current_round: number;
  total_rounds: number;
  category: WhoWouldCategory;
  current_question_id: number | null;

  created_at: string;
}

export interface WhoWouldPlayer {
  id: string;
  room_id: string;
  user_id: string;

  nickname: string;
  avatar: string;

  is_host: boolean;
  is_connected: boolean;
  score: number;

  joined_at: string;
}

function storageKey(code: string) {
  return `who_would_player_id_${code.toUpperCase()}`;
}

export function rememberWhoWouldPlayerId(
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

export function getRememberedWhoWouldPlayerId(
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

export async function createWhoWouldRoom(
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
    .from("who_would_rooms")
    .insert({
      code,
      host_user_id: userId,
    })
    .select("*")
    .single();

  if (roomError || !room) {
    throw new Error(
      roomError?.message ??
        "Could not create Who Would room."
    );
  }

  const {
    data: player,
    error: playerError,
  } = await supabase
    .from("who_would_players")
    .insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      avatar,
      is_host: true,
    })
    .select("*")
    .single();

  if (playerError || !player) {
    throw new Error(
      playerError?.message ??
        "Could not create host player."
    );
  }

  rememberWhoWouldPlayerId(
    room.code,
    player.id
  );

  return room.code;
}

export async function joinWhoWouldRoom(
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
    .from("who_would_rooms")
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
      "Who Would room not found."
    );
  }

  if (room.status !== "waiting") {
    throw new Error(
      "This game has already started."
    );
  }

  const { count } =
    await supabase
      .from("who_would_players")
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

  const { data: sameUser } =
    await supabase
      .from("who_would_players")
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
    rememberWhoWouldPlayerId(
      room.code,
      sameUser.id
    );

    return room.code;
  }

  const {
    data: player,
    error: playerError,
  } = await supabase
    .from("who_would_players")
    .insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      avatar,
      is_host: false,
    })
    .select("*")
    .single();

  if (playerError || !player) {
    throw new Error(
      playerError?.message ??
        "Could not join room."
    );
  }

  rememberWhoWouldPlayerId(
    room.code,
    player.id
  );

  return room.code;
}


export interface WhoWouldQuestion {
  round_number: number;
  total_rounds: number;
  question_id: number;
  category: Exclude<WhoWouldCategory, "RANDOM">;
  question_en: string;
  question_hr: string;
  status: WhoWouldStatus;
}

export interface WhoWouldVotePlayer {
  id: string;
  nickname: string;
  avatar: string;
}

export interface WhoWouldVoteState {
  round_number: number;
  my_player_id: string;
  my_vote_player_id: string | null;
  vote_count: number;
  player_count: number;
  players: WhoWouldVotePlayer[];
  status: WhoWouldStatus;
}

export interface WhoWouldRevealResult {
  player_id: string;
  nickname: string;
  avatar: string;
  votes: number;
}

export interface WhoWouldRevealData {
  round_number: number;
  total_rounds: number;
  results: WhoWouldRevealResult[];
}

export async function startWhoWouldGame(
  roomId: string
) {
  const { error } =
    await supabase.rpc(
      "start_who_would_game",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getWhoWouldQuestion(
  roomId: string
): Promise<WhoWouldQuestion> {
  const { data, error } =
    await supabase.rpc(
      "get_who_would_question",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as WhoWouldQuestion;
}

export async function openWhoWouldVoting(
  roomId: string
) {
  const { error } =
    await supabase.rpc(
      "open_who_would_voting",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getWhoWouldVoteState(
  roomId: string
): Promise<WhoWouldVoteState> {
  const { data, error } =
    await supabase.rpc(
      "get_who_would_vote_state",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as WhoWouldVoteState;
}

export async function castWhoWouldVote(
  roomId: string,
  votedForPlayerId: string
) {
  const { error } =
    await supabase.rpc(
      "cast_who_would_vote",
      {
        p_room_id: roomId,
        p_voted_for_player_id:
          votedForPlayerId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getWhoWouldReveal(
  roomId: string
): Promise<WhoWouldRevealData> {
  const { data, error } =
    await supabase.rpc(
      "get_who_would_reveal",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as WhoWouldRevealData;
}

export async function getWhoWouldRoomById(
  roomId: string
): Promise<WhoWouldRoom | null> {
  const { data, error } =
    await supabase
      .from("who_would_rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as WhoWouldRoom | null;
}

export async function getMyWhoWouldPlayerInRoom(
  roomId: string
): Promise<WhoWouldPlayer | null> {
  const userId =
    await ensureAnonSession();

  const { data, error } =
    await supabase
      .from("who_would_players")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as WhoWouldPlayer | null;
}


export interface WhoWouldFinalPlayer {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
}

export interface WhoWouldFinalResults {
  total_rounds: number;
  players: WhoWouldFinalPlayer[];
}

export async function finishWhoWouldRound(
  roomId: string
): Promise<"question" | "ended"> {
  const { data, error } =
    await supabase.rpc(
      "finish_who_would_round",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as "question" | "ended";
}

export async function getWhoWouldFinalResults(
  roomId: string
): Promise<WhoWouldFinalResults> {
  const { data, error } =
    await supabase.rpc(
      "get_who_would_final_results",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as WhoWouldFinalResults;
}

export async function rematchWhoWouldGame(
  roomId: string
) {
  const { error } =
    await supabase.rpc(
      "rematch_who_would_game",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateWhoWouldSettings(
  roomId: string,
  patch: Partial<
    Pick<
      WhoWouldRoom,
      | "total_rounds"
      | "category"
    >
  >
) {
  const { error } =
    await supabase
      .from("who_would_rooms")
      .update(patch)
      .eq("id", roomId);

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export async function kickWhoWouldPlayer(
  roomId: string,
  playerId: string
) {
  const { error } =
    await supabase.rpc(
      "who_would_kick_player",
      {
        p_room_id: roomId,
        p_player_id: playerId,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export function useWhoWouldRoomRealtime(
  code: string
) {
  const [room, setRoom] =
    useState<WhoWouldRoom | null>(
      null
    );

  const [
    players,
    setPlayers,
  ] = useState<
    WhoWouldPlayer[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
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
            "who_would_players"
          )
          .select("*")
          .eq(
            "room_id",
            roomId
          )
          .order(
            "joined_at",
            {
              ascending: true,
            }
          );

        if (error) {
          console.error(error);
          return;
        }

        setPlayers(
          (data ??
            []) as WhoWouldPlayer[]
        );
      },
      []
    );

  useEffect(() => {
    if (!code) return;

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
        .from("who_would_rooms")
        .select("*")
        .eq(
          "code",
          code.toUpperCase()
        )
        .maybeSingle();

      if (cancelled) return;

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
        roomData as WhoWouldRoom
      );

      await refetchPlayers(
        roomData.id
      );

      setLoading(false);

      roomChannel =
        supabase
          .channel(
            `who-would-room-${roomData.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table:
                "who_would_rooms",
              filter: `id=eq.${roomData.id}`,
            },
            (payload) => {
              setRoom(
                payload.new as WhoWouldRoom
              );
            }
          )
          .subscribe();

      playersChannel =
        supabase
          .channel(
            `who-would-players-${roomData.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table:
                "who_would_players",
              filter: `room_id=eq.${roomData.id}`,
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
              event: "UPDATE",
              schema: "public",
              table:
                "who_would_players",
              filter: `room_id=eq.${roomData.id}`,
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
              event: "DELETE",
              schema: "public",
              table:
                "who_would_players",
            },
            (payload) => {
              const deletedId =
                (
                  payload.old as
                    | { id?: string }
                    | null
                )?.id;

              if (deletedId) {
                setPlayers(
                  (current) =>
                    current.filter(
                      (player) =>
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

      if (roomChannel) {
        void supabase.removeChannel(
          roomChannel
        );
      }

      if (playersChannel) {
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