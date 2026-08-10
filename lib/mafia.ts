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

export type MafiaRoomStatus =
  | "waiting"
  | "role"
  | "night"
  | "day"
  | "discussion"
  | "voting"
  | "reveal"
  | "ended";

export type MafiaRole =
  | "MAFIA"
  | "DOCTOR"
  | "DETECTIVE"
  | "CIVILIAN";

export interface MafiaRoom {
  id: string;
  code: string;
  status: MafiaRoomStatus;
  host_user_id: string;

  discussion_time: number;
  voting_time: number;

  mafia_count: number;
  doctor_enabled: boolean;
  detective_enabled: boolean;

  day_number: number;
  winner: "MAFIA" | "CIVILIANS" | null;
  discussion_started_at: string | null;
  voting_started_at: string | null;
  created_at: string;
}

export interface MafiaPlayer {
  id: string;
  room_id: string;
  user_id: string;

  nickname: string;
  avatar: string;

  is_host: boolean;
  is_connected: boolean;
  is_alive: boolean;

  role: MafiaRole | null;
  role_ready: boolean;

  joined_at: string;
}

function storageKey(code: string) {
  return `mafia_player_id_${code.toUpperCase()}`;
}

export function rememberMafiaPlayerId(
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

export function getRememberedMafiaPlayerId(
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

export async function createMafiaRoom(
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
    .from("mafia_rooms")
    .insert({
      code,
      host_user_id: userId,
    })
    .select("*")
    .single();

  if (roomError || !room) {
    throw new Error(
      roomError?.message ??
        "Could not create Mafia room."
    );
  }

  const {
    data: player,
    error: playerError,
  } = await supabase
    .from("mafia_players")
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

  rememberMafiaPlayerId(
    room.code,
    player.id
  );

  return room.code;
}

export async function joinMafiaRoom(
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
    .from("mafia_rooms")
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
      "Mafia room not found."
    );
  }

  if (room.status !== "waiting") {
    throw new Error(
      "This Mafia game has already started."
    );
  }

  const { count } =
    await supabase
      .from("mafia_players")
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
    .from("mafia_players")
    .select("*")
    .eq("room_id", room.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (sameUser) {
    rememberMafiaPlayerId(
      room.code,
      sameUser.id
    );

    return room.code;
  }

  const {
    data: player,
    error: playerError,
  } = await supabase
    .from("mafia_players")
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
        "Could not join Mafia room."
    );
  }

  rememberMafiaPlayerId(
    room.code,
    player.id
  );

  return room.code;
}

export interface MyMafiaRole {
  player_id: string;
  nickname: string;
  avatar: string;
  role: MafiaRole;
  is_host: boolean;
}

export async function startMafiaGame(
  roomId: string
) {
  const { error } =
    await supabase.rpc(
      "start_mafia_game",
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

export async function getMyMafiaRole(
  roomId: string
): Promise<MyMafiaRole> {
  await ensureAnonSession();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_mafia_role",
    {
      p_room_id: roomId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!row || !row.role) {
    throw new Error(
      "Your Mafia role is not ready."
    );
  }

  return row as MyMafiaRole;
}

export async function markMyMafiaRoleReady(
  roomId: string
) {
  const { error } =
    await supabase.rpc(
      "mark_mafia_role_ready",
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

export async function getMafiaRoomById(
  roomId: string
): Promise<MafiaRoom | null> {
  const {
    data,
    error,
  } = await supabase
    .from("mafia_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as MafiaRoom | null;
}

export async function getMyMafiaPlayerInRoom(
  roomId: string
): Promise<MafiaPlayer | null> {
  const userId =
    await ensureAnonSession();

  const {
    data,
    error,
  } = await supabase
    .from("mafia_players")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as MafiaPlayer | null;
}

export interface MafiaNightPlayer {
  id: string;
  nickname: string;
  avatar: string;
  is_alive: boolean;
}

export interface MafiaNightState {
  room_id: string;
  status: MafiaRoomStatus;
  day_number: number;
  my_player_id: string;
  my_role: MafiaRole;
  my_is_alive: boolean;
  players: MafiaNightPlayer[];
  selected_target_player_id: string | null;
  investigation_is_mafia: boolean | null;
  night_killed_player_id: string | null;
}

export interface MafiaNightActionResult {
  action_type: "KILL" | "SAVE" | "INVESTIGATE";
  target_player_id: string;
  investigation_is_mafia: boolean | null;
  night_resolved: boolean;
}

export interface MafiaDayResult {
  day_number: number;
  killed_player_id: string | null;
  killed_nickname: string | null;
  killed_avatar: string | null;
  nobody_died: boolean;
}

export async function getMafiaNightState(
  roomId: string
): Promise<MafiaNightState> {
  const { data, error } =
    await supabase.rpc(
      "get_mafia_night_state",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as MafiaNightState;
}

export async function submitMafiaNightAction(
  roomId: string,
  targetPlayerId: string
): Promise<MafiaNightActionResult> {
  const { data, error } =
    await supabase.rpc(
      "submit_mafia_night_action",
      {
        p_room_id: roomId,
        p_target_player_id:
          targetPlayerId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as MafiaNightActionResult;
}

export async function getMafiaDayResult(
  roomId: string
): Promise<MafiaDayResult> {
  const { data, error } =
    await supabase.rpc(
      "get_mafia_day_result",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as MafiaDayResult;
}

export async function startMafiaDiscussion(
  roomId: string
) {
  const { error } =
    await supabase.rpc(
      "start_mafia_discussion",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function finishMafiaDiscussionIfDue(
  roomId: string
): Promise<boolean> {
  const { data, error } =
    await supabase.rpc(
      "finish_mafia_discussion_if_due",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export interface MafiaVotePlayer {
  id: string;
  nickname: string;
  avatar: string;
  is_alive: boolean;
}

export interface MafiaVoteState {
  day_number: number;
  my_player_id: string;
  my_is_alive: boolean;
  my_vote_player_id: string | null;
  vote_count: number;
  alive_count: number;
  players: MafiaVotePlayer[];
  status: MafiaRoomStatus;
}

export interface MafiaRevealVote {
  voter_player_id: string;
  voter_nickname: string;
  voter_avatar: string;
  target_player_id: string;
  target_nickname: string;
  target_avatar: string;
}

export interface MafiaVoteReveal {
  day_number: number;
  tied: boolean;
  eliminated_player_id: string | null;
  eliminated_nickname: string | null;
  eliminated_avatar: string | null;
  votes: MafiaRevealVote[];
}

export async function getMafiaVoteState(
  roomId: string
): Promise<MafiaVoteState> {
  const { data, error } =
    await supabase.rpc(
      "get_mafia_vote_state",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as MafiaVoteState;
}

export async function castMafiaVote(
  roomId: string,
  votedForPlayerId: string
) {
  const { error } =
    await supabase.rpc(
      "cast_mafia_vote",
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

export async function finishMafiaVotingIfDue(
  roomId: string
): Promise<boolean> {
  const { data, error } =
    await supabase.rpc(
      "finish_mafia_voting_if_due",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function getMafiaVoteReveal(
  roomId: string
): Promise<MafiaVoteReveal> {
  const { data, error } =
    await supabase.rpc(
      "get_mafia_vote_reveal",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as MafiaVoteReveal;
}

export interface MafiaFinalPlayer {
  id: string;
  nickname: string;
  avatar: string;
  role: MafiaRole;
  is_alive: boolean;
  is_host: boolean;
}

export interface MafiaFinalResults {
  winner: "MAFIA" | "CIVILIANS";
  day_number: number;
  players: MafiaFinalPlayer[];
}

export async function checkMafiaWinner(
  roomId: string
): Promise<"MAFIA" | "CIVILIANS" | null> {
  const { data, error } =
    await supabase.rpc(
      "check_mafia_winner",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as
    | "MAFIA"
    | "CIVILIANS"
    | null;
}

export async function nextMafiaNight(
  roomId: string
): Promise<"night" | "ended"> {
  const { data, error } =
    await supabase.rpc(
      "next_mafia_night",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as "night" | "ended";
}

export async function getMafiaFinalResults(
  roomId: string
): Promise<MafiaFinalResults> {
  const { data, error } =
    await supabase.rpc(
      "get_mafia_final_results",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as MafiaFinalResults;
}

export async function rematchMafiaGame(
  roomId: string
) {
  const { error } =
    await supabase.rpc(
      "rematch_mafia_game",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMafiaSettings(
  roomId: string,
  patch: Partial<
    Pick<
      MafiaRoom,
      | "discussion_time"
      | "voting_time"
      | "mafia_count"
      | "doctor_enabled"
      | "detective_enabled"
    >
  >
) {
  const { error } =
    await supabase
      .from("mafia_rooms")
      .update(patch)
      .eq("id", roomId);

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export async function kickMafiaPlayer(
  roomId: string,
  playerId: string
) {
  const { error } =
    await supabase.rpc(
      "mafia_kick_player",
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

export function useMafiaRoomRealtime(
  code: string
) {
  const [room, setRoom] =
    useState<MafiaRoom | null>(
      null
    );

  const [
    players,
    setPlayers,
  ] = useState<MafiaPlayer[]>(
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
          .from("mafia_players")
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
            []) as MafiaPlayer[]
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
        .from("mafia_rooms")
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
            "Mafia room not found."
        );

        setLoading(false);
        return;
      }

      setRoom(
        roomData as MafiaRoom
      );

      await refetchPlayers(
        roomData.id
      );

      setLoading(false);

      roomChannel =
        supabase
          .channel(
            `mafia-room-${roomData.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table:
                "mafia_rooms",
              filter: `id=eq.${roomData.id}`,
            },
            (payload) => {
              setRoom(
                payload.new as MafiaRoom
              );
            }
          )
          .subscribe();

      playersChannel =
        supabase
          .channel(
            `mafia-players-${roomData.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table:
                "mafia_players",
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
                "mafia_players",
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
                "mafia_players",
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