"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, ensureAnonSession, generateRoomCode } from "./supabase";
import { Player, Room, Question, RoundQuestion, Vote } from "./types";

const AVATARS = [
  "🐱",
  "🐶",
  "🦊",
  "🐼",
  "🐸",
  "🐵",
  "🐯",
  "🦁",
  "🐨",
  "🐰",
  "🐻",
  "🐙",
  "🐧",
  "🦄",
  "🐢",
  "🦉",
  "🦋",
  "🐺",
];

function randomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

function getCurrentLanguage(): "en" | "hr" {
  try {
    return localStorage.getItem("suspect-language") === "hr" ? "hr" : "en";
  } catch {
    return "en";
  }
}

function playerStorageKey(code: string) {
  return `suspect_player_id_${code.toUpperCase()}`;
}

export function rememberPlayerId(code: string, playerId: string) {
  try {
    localStorage.setItem(playerStorageKey(code), playerId);
  } catch {
    // localStorage unavailable (e.g. private mode) — game still works,
    // the player just won't be re-identified after a hard refresh.
  }
}

export function getRememberedPlayerId(code: string): string | null {
  try {
    return localStorage.getItem(playerStorageKey(code));
  } catch {
    return null;
  }
}

/**
 * Creates a new room, signs the host in anonymously, and adds them
 * as the first (host) player. Returns the room code to redirect to.
 */
export async function createRoom(nickname: string): Promise<string> {
  const userId = await ensureAnonSession();
  const code = generateRoomCode();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({ code, host_user_id: userId })
    .select()
    .single();

  if (roomError || !room) {
    throw new Error(roomError?.message ?? "Could not create the room. Try again.");
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      avatar: randomAvatar(),
      is_host: true,
    })
    .select()
    .single();

  if (playerError || !player) {
    throw new Error(playerError?.message ?? "Could not join your own room. Try again.");
  }

  rememberPlayerId(room.code, player.id);
  return room.code;
}

/**
 * Joins an existing room by code. Validates the room exists, hasn't
 * started, and the nickname is free.
 */
export async function joinRoom(codeInput: string, nickname: string): Promise<string> {
  const userId = await ensureAnonSession();
  const code = codeInput.trim().toUpperCase();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (roomError) throw new Error(roomError.message);
  if (!room) {
    throw new Error("That room doesn't exist. Either you typed it wrong or the universe deleted it.");
  }
  if (room.status !== "waiting") {
    throw new Error("This game has already started. Ask the host for the next one.");
  }

  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room.id);

  if ((count ?? 0) >= 12) {
    throw new Error("This room is full (12 players max).");
  }

  const { data: existing } = await supabase
    .from("players")
    .select("id, user_id")
    .eq("room_id", room.id)
    .eq("nickname", nickname)
    .maybeSingle();

  if (existing && existing.user_id !== userId) {
    throw new Error("Someone already took that nickname in this room. Try another.");
  }

  if (existing && existing.user_id === userId) {
    // Rejoining after a refresh — same anon user, same nickname
    rememberPlayerId(room.code, existing.id);
    return room.code;
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      user_id: userId,
      nickname,
      avatar: randomAvatar(),
      is_host: false,
    })
    .select()
    .single();

  if (playerError || !player) {
    throw new Error(playerError?.message ?? "Could not join the room. Try again.");
  }

  rememberPlayerId(room.code, player.id);
  return room.code;
}

/**
 * Starts the game:
 * 1. Randomly assigns one of the current players as the Suspect.
 * 2. Randomly picks one question pair from the `questions` bank.
 * 3. Creates a `rounds` row for it.
 * 4. Writes each player's private `round_questions` row — everyone
 *    gets the normal question except the Suspect, who gets the
 *    suspect question.
 * 5. Only then flips the room from "waiting" to "question" (and
 *    points it at the new round), so every client's Realtime update
 *    arrives after the round data already exists to read.
 */
export async function startGame(room: Room, players: Player[]) {
  if (players.length < 3) {
    throw new Error("Need at least 3 players to start.");
  }

  const previousUsedSuspects =
    room.current_round === 0
      ? []
      : room.used_suspect_player_ids ?? [];

  const activePlayerIds = new Set(
    players.map((player) => player.id)
  );

  const cleanedUsedSuspects =
    previousUsedSuspects.filter((playerId) =>
      activePlayerIds.has(playerId)
    );

  let eligibleSuspects = players.filter(
    (player) =>
      !cleanedUsedSuspects.includes(player.id)
  );

  // If everyone has already been the Suspect once,
  // start a fresh cycle and avoid immediately repeating
  // the Suspect from the previous round when possible.
  if (eligibleSuspects.length === 0) {
    eligibleSuspects = players.filter(
      (player) =>
        player.id !== room.suspect_player_id
    );

    if (eligibleSuspects.length === 0) {
      eligibleSuspects = players;
    }
  }

  const suspect =
    eligibleSuspects[
      Math.floor(
        Math.random() * eligibleSuspects.length
      )
    ];

  const startedFreshCycle =
    cleanedUsedSuspects.length >= players.length;

  const nextUsedSuspects =
    startedFreshCycle
      ? [suspect.id]
      : [
          ...cleanedUsedSuspects,
          suspect.id,
        ];

  // Pick one random question using both intensity and the host's pack.
  // RANDOM intentionally skips the pack filter and mixes all packs.
  let countQuery = supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("intensity", room.intensity);

  if (room.question_pack !== "RANDOM") {
    countQuery = countQuery.eq(
      "question_pack",
      room.question_pack
    );
  }

  const { count, error: countError } =
    await countQuery;

  if (countError) {
    throw new Error(countError.message);
  }

  if (!count) {
    const packLabel =
      room.question_pack === "RANDOM"
        ? "RANDOM"
        : room.question_pack;

    throw new Error(
      `No ${room.intensity} questions exist in the ${packLabel} pack yet.`
    );
  }

  const offset =
    Math.floor(Math.random() * count);

  let questionQuery = supabase
    .from("questions")
    .select("*")
    .eq("intensity", room.intensity);

  if (room.question_pack !== "RANDOM") {
    questionQuery = questionQuery.eq(
      "question_pack",
      room.question_pack
    );
  }

  const {
    data: questionRows,
    error: questionError,
  } = await questionQuery.range(
    offset,
    offset
  );

  if (questionError || !questionRows || questionRows.length === 0) {
    throw new Error(questionError?.message ?? "Could not pick a question.");
  }
  const question = questionRows[0] as Question & {
    normal_question_hr?: string | null;
    suspect_question_hr?: string | null;
  };

  const nextRoundNumber = room.current_round + 1;

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({
      room_id: room.id,
      round_number: nextRoundNumber,
      question_id: question.id,
      status: "question",
    })
    .select()
    .single();

  if (roundError || !round) {
    throw new Error(roundError?.message ?? "Could not create the round.");
  }

  const language = getCurrentLanguage();

  const normalQuestion =
    language === "hr"
      ? question.normal_question_hr || question.normal_question
      : question.normal_question;

  const suspectQuestion =
    language === "hr"
      ? question.suspect_question_hr || question.suspect_question
      : question.suspect_question;

  const roundQuestionRows = players.map((p) => ({
    round_id: round.id,
    player_id: p.id,
    question_text:
      p.id === suspect.id
        ? suspectQuestion
        : normalQuestion,
    is_suspect: p.id === suspect.id,
  }));

  const { error: rqError } = await supabase.from("round_questions").insert(roundQuestionRows);
  if (rqError) throw new Error(rqError.message);

  const { error: roomUpdateError } = await supabase
    .from("rooms")
    .update({
      status: "question",
      suspect_player_id: suspect.id,
      current_round: nextRoundNumber,
      current_round_id: round.id,
      used_suspect_player_ids:
        nextUsedSuspects,
    })
    .eq("id", room.id);

  if (roomUpdateError) throw new Error(roomUpdateError.message);
}

/**
 * Looks up the current player's own row in a room by matching the
 * signed-in anonymous user id — used on the question screen, which
 * only has the room's uuid (not the short code) to work with.
 */
export async function getMyPlayerInRoom(roomId: string): Promise<Player | null> {
  const userId = await ensureAnonSession();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Player | null;
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Room | null;
}

/**
 * Fetches the signed-in player's own private question for a round.
 * RLS guarantees this can never return another player's row.
 */
export async function getMyRoundQuestion(
  roundId: string,
  playerId: string
): Promise<RoundQuestion | null> {
  const { data, error } = await supabase
    .from("round_questions")
    .select("*")
    .eq("round_id", roundId)
    .eq("player_id", playerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as RoundQuestion | null;
}

/**
 * Marks the signed-in player as ready to move on (e.g. after
 * answering their question out loud). RLS only lets a player update
 * their own row, so this can never flip someone else's status.
 */
export async function setPlayerReady(playerId: string): Promise<void> {
  const { error } = await supabase
    .from("players")
    .update({ is_ready: true })
    .eq("id", playerId);
  if (error) throw new Error(error.message);
}

/**
 * Host-only: moves the room from the answer phase into voting.
 */
export async function startVoting(roomId: string): Promise<void> {
  const { error } = await supabase
    .from("rooms")
    .update({ status: "voting" })
    .eq("id", roomId);

  if (error) {
    const detail = [error.message, error.details, error.hint].filter(Boolean).join(" — ");
    throw new Error(detail || "Could not start voting.");
  }
}

/**
 * Checks whether this player already submitted a vote for this round.
 */
export async function getMyVote(
  roundId: string,
  voterPlayerId: string
): Promise<Vote | null> {
  const { data, error } = await supabase
    .from("votes")
    .select("*")
    .eq("round_id", roundId)
    .eq("voter_player_id", voterPlayerId)
    .maybeSingle();

  if (error) {
    const detail = [error.message, error.details, error.hint]
      .filter(Boolean)
      .join(" — ");
    throw new Error(detail || "Could not check your vote.");
  }

  return data as Vote | null;
}

/**
 * Submits one vote. A PostgreSQL 23505 duplicate means this player
 * already has a vote for the round, so we treat that state as success.
 */
export async function submitVote(
  roundId: string,
  voterPlayerId: string,
  votedForPlayerId: string
): Promise<void> {
  const { error } = await supabase.from("votes").insert({
    round_id: roundId,
    voter_player_id: voterPlayerId,
    voted_for_player_id: votedForPlayerId,
  });

  if (error) {
    if (error.code === "23505") return;

    const detail = [error.message, error.details, error.hint]
      .filter(Boolean)
      .join(" — ");
    throw new Error(detail || "Could not submit your vote.");
  }
}

/**
 * Host-only: moves the room from voting into the reveal phase.
 * Same shape as startVoting — a plain host-checked update to rooms,
 * protected by the existing rooms_update_host_only RLS policy.
 */
export async function revealSuspect(roomId: string): Promise<void> {
  // Scoring is handled atomically in PostgreSQL so the host cannot
  // accidentally score the same round twice and RLS does not block
  // updating other players' scores/statistics.
  const { error } = await supabase.rpc("score_current_round", {
    p_room_id: roomId,
  });

  if (error) {
    const detail = [
      error.message,
      error.details,
      error.hint,
    ]
      .filter(Boolean)
      .join(" — ");

    throw new Error(
      detail || "Could not reveal and score the round."
    );
  }
}

/**
 * Live votes for a round — powers the "Votes submitted: X/Y" counter
 * and lets each client tell whether it (or anyone) has already voted.
 * RLS scopes visibility to players who actually belong to the room.
 */
export function useVotesRealtime(roundId: string | null) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (rId: string) => {
    const { data, error } = await supabase.from("votes").select("*").eq("round_id", rId);
    if (error) {
      setError(error.message);
      return;
    }
    setVotes((data as Vote[]) ?? []);
  }, []);

  useEffect(() => {
    if (!roundId) {
      setVotes([]);
      setLoading(false);
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      await refetch(roundId as string);
      if (cancelled) return;
      setLoading(false);

      channel = supabase
        .channel(`votes-${roundId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "votes", filter: `round_id=eq.${roundId}` },
          () => refetch(roundId as string)
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [roundId, refetch]);

  return { votes, loading, error };
}

/**
 * Subscribes to a room's live state, the same way useRoomRealtime does,
 * but keyed by the room's uuid instead of its short code — for pages
 * like /answer/[roomId] and /question/[roomId] that only have the id.
 */
export function useRoomByIdRealtime(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchPlayers = useCallback(async (rId: string) => {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", rId)
      .order("joined_at", { ascending: true });
    if (data) setPlayers(data as Player[]);
  }, []);

  useEffect(() => {
    let roomChannel: ReturnType<typeof supabase.channel> | null = null;
    let playersChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function init() {
      setLoading(true);
      await ensureAnonSession();

      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();

      if (cancelled) return;

      if (roomError || !roomData) {
        setError("That room doesn't exist. Either you typed it wrong or the universe deleted it.");
        setLoading(false);
        return;
      }

      setRoom(roomData as Room);
      await refetchPlayers(roomData.id);
      setLoading(false);

      roomChannel = supabase
        .channel(`room-by-id-${roomData.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomData.id}` },
          (payload) => setRoom(payload.new as Room)
        )
        .subscribe();

      playersChannel = supabase
        .channel(`players-by-id-${roomData.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "players",
            filter: `room_id=eq.${roomData.id}`,
          },
          () => refetchPlayers(roomData.id)
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "players",
            filter: `room_id=eq.${roomData.id}`,
          },
          () => refetchPlayers(roomData.id)
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "players",
          },
          () => refetchPlayers(roomData.id)
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (roomChannel) supabase.removeChannel(roomChannel);
      if (playersChannel) supabase.removeChannel(playersChannel);
    };
  }, [roomId, refetchPlayers]);

  return { room, players, loading, error };
}

/**
 * Subscribes to a room's live state: the room row itself and its
 * player list, kept in sync via Supabase Realtime.
 */
export function useRoomRealtime(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchPlayers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });
    if (data) setPlayers(data as Player[]);
  }, []);

  useEffect(() => {
    let roomChannel: ReturnType<typeof supabase.channel> | null = null;
    let playersChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function init() {
      setLoading(true);
      await ensureAnonSession();

      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code.toUpperCase())
        .maybeSingle();

      if (cancelled) return;

      if (roomError || !roomData) {
        setError("That room doesn't exist. Either you typed it wrong or the universe deleted it.");
        setLoading(false);
        return;
      }

      setRoom(roomData as Room);
      await refetchPlayers(roomData.id);
      setLoading(false);

      roomChannel = supabase
        .channel(`room-${roomData.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomData.id}` },
          (payload) => setRoom(payload.new as Room)
        )
        .subscribe();

      playersChannel = supabase
        .channel(`players-${roomData.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "players",
            filter: `room_id=eq.${roomData.id}`,
          },
          () => refetchPlayers(roomData.id)
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "players",
            filter: `room_id=eq.${roomData.id}`,
          },
          () => refetchPlayers(roomData.id)
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "players",
          },
          () => refetchPlayers(roomData.id)
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (roomChannel) supabase.removeChannel(roomChannel);
      if (playersChannel) supabase.removeChannel(playersChannel);
    };
  }, [code, refetchPlayers]);

  return { room, players, loading, error };
}