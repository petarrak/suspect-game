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

export type LiarCategory =
  | "FOOD"
  | "MOVIES"
  | "ANIMALS"
  | "COUNTRIES"
  | "JOBS"
  | "SPORTS"
  | "GAMING"
  | "RANDOM";

export type LiarRoomStatus =
  | "waiting"
  | "word"
  | "discussion"
  | "voting"
  | "reveal"
  | "ended";

export interface LiarRoom {
  id: string;
  code: string;
  status: LiarRoomStatus;
  host_user_id: string;
  current_round: number;
  total_rounds: number;
  discussion_time: number;
  category: LiarCategory;
  current_liar_player_id: string | null;
  current_word_id: number | null;
  discussion_started_at: string | null;
  voting_started_at: string | null;
  voting_time: number;
  created_at: string;
}

export interface LiarPlayer {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  avatar: string;
  is_host: boolean;
  score: number;
  is_connected: boolean;
  role_ready: boolean;
  joined_at: string;
}

export interface LiarAssignment {
  is_liar: boolean;
  word_en: string | null;
  word_hr: string | null;
  category: string | null;
  round_number: number;
  total_rounds: number;
}

function storageKey(code: string) {
  return `liar_player_id_${code.toUpperCase()}`;
}

export function rememberLiarPlayerId(
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

export function getRememberedLiarPlayerId(
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

export async function createLiarRoom(
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
    .from("liar_rooms")
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
        "Could not create Liar room."
    );
  }

  const {
    data: player,
    error: playerError,
  } = await supabase
    .from("liar_players")
    .insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      avatar,
      is_host: true,
    })
    .select("*")
    .single();

  if (
    playerError ||
    !player
  ) {
    throw new Error(
      playerError?.message ??
        "Could not create host player."
    );
  }

  rememberLiarPlayerId(
    room.code,
    player.id
  );

  return room.code;
}

export async function joinLiarRoom(
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
    .from("liar_rooms")
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
      "Liar room not found."
    );
  }

  if (
    room.status !==
    "waiting"
  ) {
    throw new Error(
      "This Liar game has already started."
    );
  }

  const { count } =
    await supabase
      .from("liar_players")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "room_id",
        room.id
      );

  if (
    (count ?? 0) >= 12
  ) {
    throw new Error(
      "This room is full (12 players max)."
    );
  }

  const {
    data: sameUser,
  } = await supabase
    .from("liar_players")
    .select("*")
    .eq("room_id", room.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (sameUser) {
    rememberLiarPlayerId(
      room.code,
      sameUser.id
    );

    return room.code;
  }

  const {
    data: player,
    error: playerError,
  } = await supabase
    .from("liar_players")
    .insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      avatar,
      is_host: false,
    })
    .select("*")
    .single();

  if (
    playerError ||
    !player
  ) {
    throw new Error(
      playerError?.message ??
        "Could not join Liar room."
    );
  }

  rememberLiarPlayerId(
    room.code,
    player.id
  );

  return room.code;
}

export async function updateLiarSettings(
  roomId: string,
  patch: Partial<
    Pick<
      LiarRoom,
      | "total_rounds"
      | "discussion_time"
      | "category"
    >
  >
) {
  const { error } =
    await supabase
      .from("liar_rooms")
      .update(patch)
      .eq("id", roomId);

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export async function kickLiarPlayer(
  roomId: string,
  playerId: string
) {
  const { error } =
    await supabase.rpc(
      "liar_kick_player",
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

export async function startLiarRound(
  roomId: string
) {
  const { error } =
    await supabase.rpc(
      "start_liar_round",
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

export async function getMyLiarAssignment(
  roomId: string
): Promise<LiarAssignment> {
  await ensureAnonSession();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_liar_assignment",
    {
      p_room_id: roomId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const assignment =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!assignment) {
    throw new Error(
      "Your Liar assignment is not ready."
    );
  }

  return assignment as LiarAssignment;
}

export async function markMyLiarRoleReady(
  roomId: string
) {
  const { error } =
    await supabase.rpc(
      "mark_liar_role_ready",
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

export async function finishLiarDiscussionIfDue(
  roomId: string
): Promise<boolean> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "finish_liar_discussion_if_due",
    {
      p_room_id: roomId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return Boolean(data);
}


export interface LiarVoteState {
  vote_count: number;
  player_count: number;
  my_vote_player_id: string | null;
}

export interface LiarRevealVote {
  voter_player_id: string;
  voter_nickname: string;
  voter_avatar: string;
  voted_for_player_id: string;
  target_nickname: string;
  target_avatar: string;
  correct: boolean;
}

export interface LiarRevealScore {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
}

export interface LiarRevealData {
  round_number: number;
  liar_player_id: string;
  liar_nickname: string;
  liar_avatar: string;
  liar_caught: boolean;
  correct_vote_count: number;
  word_en: string;
  word_hr: string;
  votes: LiarRevealVote[];
  scores: LiarRevealScore[];
}

export async function castLiarVote(
  roomId: string,
  votedForPlayerId: string
) {
  const { error } = await supabase.rpc(
    "cast_liar_vote",
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

export async function getLiarVoteState(
  roomId: string
): Promise<LiarVoteState> {
  const { data, error } =
    await supabase.rpc(
      "get_liar_vote_state",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as LiarVoteState;
}

export async function finishLiarVotingIfDue(
  roomId: string
): Promise<boolean> {
  const { data, error } =
    await supabase.rpc(
      "finish_liar_voting_if_due",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function getLiarReveal(
  roomId: string
): Promise<LiarRevealData> {
  const { data, error } =
    await supabase.rpc(
      "get_liar_reveal",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as LiarRevealData;
}

export async function nextLiarRound(
  roomId: string
): Promise<"word" | "ended"> {
  const { data, error } =
    await supabase.rpc(
      "next_liar_round",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as "word" | "ended";
}

export async function rematchLiarGame(
  roomId: string
) {
  const { error } =
    await supabase.rpc(
      "rematch_liar_game",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getLiarRoomById(
  roomId: string
): Promise<LiarRoom | null> {
  const {
    data,
    error,
  } = await supabase
    .from("liar_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data as LiarRoom | null
  );
}

export async function getMyLiarPlayerInRoom(
  roomId: string
): Promise<LiarPlayer | null> {
  const userId =
    await ensureAnonSession();

  const {
    data,
    error,
  } = await supabase
    .from("liar_players")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data as LiarPlayer | null
  );
}

export function useLiarRoomRealtime(
  code: string
) {
  const [room, setRoom] =
    useState<LiarRoom | null>(
      null
    );

  const [
    players,
    setPlayers,
  ] = useState<LiarPlayer[]>(
    []
  );

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
          .from("liar_players")
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
          console.error(
            error
          );
          return;
        }

        setPlayers(
          (data ??
            []) as LiarPlayer[]
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
        .from("liar_rooms")
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
            "Liar room not found."
        );

        setLoading(false);
        return;
      }

      setRoom(
        roomData as LiarRoom
      );

      await refetchPlayers(
        roomData.id
      );

      setLoading(false);

      roomChannel =
        supabase
          .channel(
            `liar-room-${roomData.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table:
                "liar_rooms",
              filter: `id=eq.${roomData.id}`,
            },
            (payload) => {
              setRoom(
                payload.new as LiarRoom
              );
            }
          )
          .subscribe();

      playersChannel =
        supabase
          .channel(
            `liar-players-${roomData.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table:
                "liar_players",
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
                "liar_players",
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
                "liar_players",
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