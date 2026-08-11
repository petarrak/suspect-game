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


/* ============================================================
   TYPES
============================================================ */

export type DrawGuessStatus =
  | "waiting"
  | "choosing"
  | "drawing"
  | "reveal"
  | "ended";


export type DrawGuessDifficulty =
  | "easy"
  | "medium"
  | "hard";

export type DrawGuessCategory =
  | "actions"
  | "animals"
  | "body"
  | "clothing"
  | "food"
  | "gaming"
  | "jobs"
  | "nature"
  | "objects"
  | "places"
  | "random"
  | "sports"
  | "vehicles";


export interface DrawGuessRoom {
  id: string;
  code: string;

  host_user_id: string;

  status: DrawGuessStatus;

  current_round: number;
  total_rounds: number;

  round_time_seconds: number;

  word_difficulty:
    | DrawGuessDifficulty
    | "all";

  word_category:
    | DrawGuessCategory
    | "all";

  current_drawer_player_id:
    | string
    | null;

  current_word_id:
    | number
    | null;

  round_started_at:
    | string
    | null;

  round_ends_at:
    | string
    | null;

  created_at: string;
}


export interface DrawGuessPlayer {
  id: string;

  room_id: string;
  user_id: string;

  nickname: string;
  avatar: string;

  score: number;

  has_guessed: boolean;

  is_host: boolean;
  is_connected: boolean;

  joined_at: string;
}


export interface DrawGuessWord {
  id: number;

  category: string;

  word_hr: string;
  word_en: string;

  difficulty:
    DrawGuessDifficulty;

  is_active: boolean;

  created_at: string;
}


export interface DrawGuessRound {
  id: string;

  room_id: string;

  round_number: number;

  drawer_player_id: string;

  word_id: number;

  started_at:
    | string
    | null;

  ended_at:
    | string
    | null;

  created_at: string;
}


export interface DrawGuessGuess {
  id: number;

  room_id: string;
  round_id: string;
  player_id: string;

  guess_text: string;

  is_correct: boolean;

  points_awarded: number;

  created_at: string;
}


export interface DrawGuessStroke {
  id: number;

  room_id: string;
  round_id: string;
  player_id: string;

  stroke_data: unknown;

  created_at: string;
}


/* ============================================================
   LOCAL STORAGE
============================================================ */

function storageKey(
  code: string
) {
  return `draw_guess_player_id_${code.toUpperCase()}`;
}


export function rememberDrawGuessPlayerId(
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


export function getRememberedDrawGuessPlayerId(
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


/* ============================================================
   CREATE ROOM
============================================================ */

export async function createDrawGuessRoom(
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
    .from(
      "draw_guess_rooms"
    )
    .insert({
      code,
      host_user_id:
        userId,

      status:
        "waiting",

      total_rounds:
        5,

      round_time_seconds:
        60,

      word_difficulty:
        "all",

      word_category:
        "all",
    })
    .select("*")
    .single();

  if (
    roomError ||
    !room
  ) {
    throw new Error(
      roomError?.message ??
        "Could not create Draw & Guess room."
    );
  }


  const {
    data: player,
    error: playerError,
  } = await supabase
    .from(
      "draw_guess_players"
    )
    .insert({
      room_id:
        room.id,

      user_id:
        userId,

      nickname,
      avatar,

      is_host:
        true,

      is_connected:
        true,

      score:
        0,

      has_guessed:
        false,
    })
    .select("*")
    .single();


  if (
    playerError ||
    !player
  ) {
    /*
     * If player creation fails,
     * clean up the room.
     */

    await supabase
      .from(
        "draw_guess_rooms"
      )
      .delete()
      .eq(
        "id",
        room.id
      );

    throw new Error(
      playerError?.message ??
        "Could not create host player."
    );
  }


  rememberDrawGuessPlayerId(
    room.code,
    player.id
  );


  return room.code;
}


/* ============================================================
   JOIN ROOM
============================================================ */

export async function joinDrawGuessRoom(
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
    .from(
      "draw_guess_rooms"
    )
    .select("*")
    .eq(
      "code",
      code
    )
    .maybeSingle();


  if (roomError) {
    throw new Error(
      roomError.message
    );
  }


  if (!room) {
    throw new Error(
      "Draw & Guess room not found."
    );
  }


  if (
    room.status !==
    "waiting"
  ) {
    const {
      data: reconnectingPlayer,
      error: reconnectError,
    } = await supabase
      .from("draw_guess_players")
      .select("*")
      .eq("room_id", room.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (reconnectError) {
      throw new Error(reconnectError.message);
    }

    if (reconnectingPlayer) {
      const { error: updateError } = await supabase
        .from("draw_guess_players")
        .update({
          is_connected: true,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", reconnectingPlayer.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      rememberDrawGuessPlayerId(
        room.code,
        reconnectingPlayer.id
      );

      return room.code;
    }

    throw new Error(
      "This game has already started."
    );
  }


  /*
   * Maximum 12 players.
   */

  const {
    count,
    error: countError,
  } = await supabase
    .from(
      "draw_guess_players"
    )
    .select("*", {
      count:
        "exact",

      head:
        true,
    })
    .eq(
      "room_id",
      room.id
    );


  if (countError) {
    throw new Error(
      countError.message
    );
  }


  if (
    (count ?? 0) >=
    12
  ) {
    throw new Error(
      "This room is full (12 players max)."
    );
  }


  /*
   * Same browser/user reconnecting.
   */

  const {
    data: sameUser,
    error:
      sameUserError,
  } = await supabase
    .from(
      "draw_guess_players"
    )
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


  if (
    sameUserError
  ) {
    throw new Error(
      sameUserError.message
    );
  }


  if (sameUser) {
    await supabase
      .from(
        "draw_guess_players"
      )
      .update({
        is_connected:
          true,
      })
      .eq(
        "id",
        sameUser.id
      );


    rememberDrawGuessPlayerId(
      room.code,
      sameUser.id
    );


    return room.code;
  }


  /*
   * Create new player.
   */

  const {
    data: player,
    error: playerError,
  } = await supabase
    .from(
      "draw_guess_players"
    )
    .insert({
      room_id:
        room.id,

      user_id:
        userId,

      nickname,
      avatar,

      is_host:
        false,

      is_connected:
        true,

      score:
        0,

      has_guessed:
        false,
    })
    .select("*")
    .single();


  if (
    playerError ||
    !player
  ) {
    throw new Error(
      playerError?.message ??
        "Could not join Draw & Guess room."
    );
  }


  rememberDrawGuessPlayerId(
    room.code,
    player.id
  );


  return room.code;
}


/* ============================================================
   GET ROOM BY ID
============================================================ */

export async function getDrawGuessRoomById(
  roomId: string
): Promise<
  DrawGuessRoom | null
> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "draw_guess_rooms"
    )
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


  return (
    data as
      | DrawGuessRoom
      | null
  );
}


/* ============================================================
   GET ROOM BY CODE
============================================================ */

export async function getDrawGuessRoomByCode(
  codeInput: string
): Promise<
  DrawGuessRoom | null
> {
  const code =
    codeInput
      .trim()
      .toUpperCase();


  const {
    data,
    error,
  } = await supabase
    .from(
      "draw_guess_rooms"
    )
    .select("*")
    .eq(
      "code",
      code
    )
    .maybeSingle();


  if (error) {
    throw new Error(
      error.message
    );
  }


  return (
    data as
      | DrawGuessRoom
      | null
  );
}


/* ============================================================
   GET MY PLAYER
============================================================ */

export async function getMyDrawGuessPlayerInRoom(
  roomId: string
): Promise<
  DrawGuessPlayer | null
> {
  const userId =
    await ensureAnonSession();


  const {
    data,
    error,
  } = await supabase
    .from(
      "draw_guess_players"
    )
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


  return (
    data as
      | DrawGuessPlayer
      | null
  );
}


/* ============================================================
   UPDATE SETTINGS
============================================================ */

export async function updateDrawGuessSettings(
  roomId: string,
  patch: Partial<
    Pick<
      DrawGuessRoom,
      | "total_rounds"
      | "round_time_seconds"
      | "word_difficulty"
      | "word_category"
    >
  >
) {
  const {
    error,
  } = await supabase
    .from(
      "draw_guess_rooms"
    )
    .update(
      patch
    )
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


/* ============================================================
   KICK PLAYER
============================================================ */

export async function kickDrawGuessPlayer(
  roomId: string,
  playerId: string
) {
  const {
    error,
  } = await supabase
    .from(
      "draw_guess_players"
    )
    .delete()
    .eq(
      "room_id",
      roomId
    )
    .eq(
      "id",
      playerId
    );


  if (error) {
    throw new Error(
      error.message
    );
  }
}


/* ============================================================
   GET PLAYERS
============================================================ */

export async function getDrawGuessPlayers(
  roomId: string
): Promise<
  DrawGuessPlayer[]
> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "draw_guess_players"
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
    throw new Error(
      error.message
    );
  }


  return (
    data ??
    []
  ) as DrawGuessPlayer[];
}


/* ============================================================
   REALTIME LOBBY
============================================================ */

export function useDrawGuessRoomRealtime(
  codeInput: string
) {
  const code =
    codeInput.toUpperCase();


  const [
    room,
    setRoom,
  ] =
    useState<
      DrawGuessRoom | null
    >(null);


  const [
    players,
    setPlayers,
  ] =
    useState<
      DrawGuessPlayer[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);


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
            "draw_guess_players"
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
          (
            data ??
            []
          ) as DrawGuessPlayer[]
        );
      },
      []
    );


  useEffect(() => {
    if (!code) {
      return;
    }


    let cancelled =
      false;


    let roomChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | null =
        null;


    let playersChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | null =
        null;


    async function init() {
      setLoading(
        true
      );

      setError(
        null
      );


      await ensureAnonSession();


      const {
        data: roomData,
        error:
          roomError,
      } = await supabase
        .from(
          "draw_guess_rooms"
        )
        .select("*")
        .eq(
          "code",
          code
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
            "Draw & Guess room not found."
        );

        setLoading(
          false
        );

        return;
      }


      const typedRoom =
        roomData as DrawGuessRoom;


      setRoom(
        typedRoom
      );


      await refetchPlayers(
        typedRoom.id
      );


      if (cancelled) {
        return;
      }


      setLoading(
        false
      );


      /*
       * ROOM REALTIME
       */

      roomChannel =
        supabase
          .channel(
            `draw-guess-room-${typedRoom.id}`
          )
          .on(
            "postgres_changes",
            {
              event:
                "UPDATE",

              schema:
                "public",

              table:
                "draw_guess_rooms",

              filter:
                `id=eq.${typedRoom.id}`,
            },
            (
              payload
            ) => {
              setRoom(
                payload.new as DrawGuessRoom
              );
            }
          )
          .subscribe();


      /*
       * PLAYER REALTIME
       */

      playersChannel =
        supabase
          .channel(
            `draw-guess-players-${typedRoom.id}`
          )
          .on(
            "postgres_changes",
            {
              event:
                "INSERT",

              schema:
                "public",

              table:
                "draw_guess_players",

              filter:
                `room_id=eq.${typedRoom.id}`,
            },
            () => {
              void refetchPlayers(
                typedRoom.id
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
                "draw_guess_players",

              filter:
                `room_id=eq.${typedRoom.id}`,
            },
            () => {
              void refetchPlayers(
                typedRoom.id
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
                "draw_guess_players",
            },
            (
              payload
            ) => {
              const deletedId =
                (
                  payload.old as
                    | {
                        id?:
                          string;
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
                typedRoom.id
              );
            }
          )
          .subscribe();
    }


    void init();


    return () => {
      cancelled =
        true;


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


/* ============================================================
   START GAME
============================================================ */

export async function startDrawGuessGame(
  roomId: string
) {
  await ensureAnonSession();

  const { data, error } = await supabase.rpc(
    "start_draw_guess_game",
    { p_room_id: roomId }
  );

  if (error) {
    throw new Error(error.message);
  }

  return data as {
    status: "choosing";
    round: number;
    drawer_player_id: string;
  };
}

/* ============================================================
   WORD CHOICES
============================================================ */

export interface DrawGuessWordChoice {
  id: number;
  category: string;
  word_hr: string;
  word_en: string;
  difficulty: DrawGuessDifficulty;
}

export async function getDrawGuessWordChoices(
  roomId: string
): Promise<DrawGuessWordChoice[]> {
  await ensureAnonSession();

  const { data, error } = await supabase.rpc(
    "get_draw_guess_word_choices",
    { p_room_id: roomId }
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DrawGuessWordChoice[];
}

/* ============================================================
   CHOOSE WORD
============================================================ */

export async function chooseDrawGuessWord(
  roomId: string,
  wordId: number
) {
  await ensureAnonSession();

  const { data, error } = await supabase.rpc(
    "choose_draw_guess_word",
    {
      p_room_id: roomId,
      p_word_id: wordId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return data as {
    status: "drawing";
    round_id: string;
    round: number;
    ends_at: string;
  };
}
/* ============================================================
   GAME STATE
============================================================ */

export interface DrawGuessGameState {
  room_id: string;
  code: string;

  status: DrawGuessStatus;

  round_number: number;
  total_rounds: number;
  round_time_seconds: number;

  round_started_at: string | null;
  round_ends_at: string | null;
  round_id: string | null;

  my_player_id: string | null;
  is_drawer: boolean;
  has_guessed: boolean;

  drawer_player_id: string | null;

  drawer: {
    id: string;
    nickname: string;
    avatar: string;
  } | null;

  word: {
    id: number;
    category: string;
    word_hr: string;
    word_en: string;
    difficulty: DrawGuessDifficulty;
  } | null;

  word_length: number | null;

  players: Array<{
    id: string;
    nickname: string;
    avatar: string;
    score: number;
    has_guessed: boolean;
    is_host: boolean;
  }>;

  guesses: Array<{
    id: number;
    player_id: string;
    nickname: string;
    avatar: string;
    guess_text: string | null;
    is_correct: boolean;
    points_awarded: number;
    created_at: string;
  }>;

  server_time?: string;
}

export async function getDrawGuessGameState(
  roomId: string
): Promise<DrawGuessGameState> {
  await ensureAnonSession();

  const { data, error } =
    await supabase.rpc(
      "get_draw_guess_game_state",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as DrawGuessGameState;
}

/* ============================================================
   SUBMIT GUESS
============================================================ */

export interface SubmitDrawGuessResult {
  correct?: boolean;
  is_correct?: boolean;

  points?: number;
  points_awarded?: number;

  message?: string;

  [key: string]: unknown;
}

export async function submitDrawGuessGuess(
  roomId: string,
  guess: string
): Promise<SubmitDrawGuessResult> {
  await ensureAnonSession();

  const cleaned =
    guess.trim();

  if (!cleaned) {
    throw new Error(
      "Guess cannot be empty."
    );
  }

  const { data, error } =
    await supabase.rpc(
      "submit_draw_guess_guess",
      {
        p_room_id: roomId,
        p_guess: cleaned,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return (
    data ?? {}
  ) as SubmitDrawGuessResult;
}

/* ============================================================
   FINISH ROUND
============================================================ */

export interface FinishDrawGuessRoundResult {
  status?: DrawGuessStatus;

  round?: number;

  next_round?: number;

  drawer_player_id?: string | null;

  [key: string]: unknown;
}

export async function finishDrawGuessRound(
  roomId: string
): Promise<FinishDrawGuessRoundResult> {
  await ensureAnonSession();

  const { error: presenceError } =
    await supabase.rpc(
      "prune_draw_guess_presence",
      {
        p_room_id: roomId,
      }
    );

  if (presenceError) {
    throw new Error(presenceError.message);
  }

  const { data, error } =
    await supabase.rpc(
      "finish_draw_guess_round",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return (
    data ?? {}
  ) as FinishDrawGuessRoundResult;
}

/* ============================================================
   FINAL RESULTS
============================================================ */

export interface DrawGuessFinalResult {
  player_id: string;

  nickname: string;

  avatar: string;

  score: number;

  position?: number;

  rank?: number;
}

export async function getDrawGuessFinalResults(
  roomId: string
): Promise<DrawGuessFinalResult[]> {
  await ensureAnonSession();

  const { data, error } =
    await supabase.rpc(
      "get_draw_guess_final_results",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  if (Array.isArray(data)) {
    return data as DrawGuessFinalResult[];
  }

  if (
    data &&
    typeof data === "object" &&
    "players" in data &&
    Array.isArray(
      (
        data as {
          players?: unknown;
        }
      ).players
    )
  ) {
    return (
      data as {
        players: DrawGuessFinalResult[];
      }
    ).players;
  }

  return [];
}

/* ============================================================
   CURRENT ROUND
============================================================ */

export async function getCurrentDrawGuessRound(
  roomId: string
): Promise<DrawGuessRound | null> {
  const { data, error } =
    await supabase
      .from("draw_guess_rounds")
      .select("*")
      .eq("room_id", roomId)
      .order(
        "round_number",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (
    data as DrawGuessRound | null
  );
}

/* ============================================================
   STROKES
============================================================ */

export async function getDrawGuessStrokes(
  roomId: string,
  roundId: string
): Promise<DrawGuessStroke[]> {
  const { data, error } =
    await supabase
      .from("draw_guess_strokes")
      .select("*")
      .eq("room_id", roomId)
      .eq("round_id", roundId)
      .order(
        "id",
        {
          ascending: true,
        }
      );

  if (error) {
    throw new Error(error.message);
  }

  return (
    data ?? []
  ) as DrawGuessStroke[];
}

export async function addDrawGuessStroke(
  roomId: string,
  roundId: string,
  playerId: string,
  strokeData: unknown
): Promise<DrawGuessStroke> {
  await ensureAnonSession();

  const { data, error } =
    await supabase
      .from("draw_guess_strokes")
      .insert({
        room_id: roomId,
        round_id: roundId,
        player_id: playerId,
        stroke_data: strokeData,
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as DrawGuessStroke;
}

/* ============================================================
   CLEAR CANVAS
============================================================ */

export async function clearDrawGuessCanvas(
  roomId: string,
  roundId: string
) {
  await ensureAnonSession();

  const { error } =
    await supabase
      .from("draw_guess_strokes")
      .delete()
      .eq("room_id", roomId)
      .eq("round_id", roundId);

  if (error) {
    throw new Error(error.message);
  }
}

/* ============================================================
   GUESSES
============================================================ */

export async function getDrawGuessGuesses(
  roomId: string,
  roundId: string
): Promise<DrawGuessGuess[]> {
  const { data, error } =
    await supabase
      .from("draw_guess_guesses")
      .select("*")
      .eq("room_id", roomId)
      .eq("round_id", roundId)
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

  if (error) {
    throw new Error(error.message);
  }

  return (
    data ?? []
  ) as DrawGuessGuess[];
}
/* ============================================================
   RESTART GAME
============================================================ */

export async function restartDrawGuessGame(
  roomId: string
) {
  await ensureAnonSession();

  const { data, error } =
    await supabase.rpc(
      "restart_draw_guess_game",
      {
        p_room_id: roomId,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as {
    status: "choosing";
    round: number;
    drawer_player_id: string;
  };
}

/* ============================================================
   PLAYER PRESENCE / RECONNECT
============================================================ */

export function useDrawGuessPresence(
  roomId: string | null | undefined
) {
  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;
    let touching = false;

    async function touch() {
      if (
        cancelled ||
        touching ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      touching = true;

      try {
        await ensureAnonSession();

        await supabase.rpc(
          "touch_draw_guess_presence",
          {
            p_room_id: roomId,
          }
        );
      } finally {
        touching = false;
      }
    }

    function handleVisible() {
      if (document.visibilityState === "visible") {
        void touch();
      }
    }

    void touch();

    const interval = window.setInterval(
      () => void touch(),
      5000
    );

    window.addEventListener("online", touch);
    document.addEventListener(
      "visibilitychange",
      handleVisible
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("online", touch);
      document.removeEventListener(
        "visibilitychange",
        handleVisible
      );
    };
  }, [roomId]);
}