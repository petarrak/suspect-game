import { ensureAnonSession, supabase } from "@/lib/supabase";

export type TruthDarePack =
  | "CLASSIC"
  | "FUNNY"
  | "PARTY"
  | "AFTER_DARK"
  | "BRUTAL"
  | "HOT"
  | "DRINKING"
  | "SECRETS"
  | "RED_FLAGS";

export interface TruthDareRoom {
  id: string;
  code: string;
  host_user_id: string;
  status: "waiting" | "playing" | "ended";
  selected_packs: TruthDarePack[];
  current_turn: number;
  max_turns: number;
  current_player_id: string | null;
  current_prompt_id: number | null;
  current_choice: "TRUTH" | "DARE" | null;
}

export interface TruthDarePlayer {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  avatar: string;
  is_host: boolean;
  is_connected: boolean;
  completed_turns: number;
  skipped_turns: number;
  joined_at: string;
}

export interface TruthDarePrompt {
  id: number;
  prompt_type: "TRUTH" | "DARE";
  pack: TruthDarePack;
  text_hr: string;
  text_en: string;
}

function message(error: { message?: string } | null) {
  return error?.message ?? "Something went wrong.";
}

export async function createTruthDareRoom(
  nickname: string,
  avatar: string
) {
  await ensureAnonSession();
  const { data, error } = await supabase.rpc("create_truth_dare_room", {
    p_nickname: nickname,
    p_avatar: avatar,
  });
  if (error) throw new Error(message(error));
  return data as { room_id: string; code: string; player_id: string };
}

export async function joinTruthDareRoom(
  code: string,
  nickname: string,
  avatar: string
) {
  await ensureAnonSession();
  const { data, error } = await supabase.rpc("join_truth_dare_room", {
    p_code: code.trim().toUpperCase(),
    p_nickname: nickname,
    p_avatar: avatar,
  });
  if (error) throw new Error(message(error));
  return data as { room_id: string; code: string; player_id: string };
}

export async function getTruthDareRoomByCode(code: string) {
  await ensureAnonSession();
  const { data, error } = await supabase
    .from("truth_dare_rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();
  if (error) throw new Error(message(error));
  return data as TruthDareRoom;
}

export async function getTruthDareRoom(roomId: string) {
  await ensureAnonSession();
  const { data, error } = await supabase
    .from("truth_dare_rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  if (error) throw new Error(message(error));
  return data as TruthDareRoom;
}

export async function getTruthDarePlayers(roomId: string) {
  const { data, error } = await supabase
    .from("truth_dare_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  if (error) throw new Error(message(error));
  return (data ?? []) as TruthDarePlayer[];
}

export async function getMyTruthDarePlayer(roomId: string) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from("truth_dare_players")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(message(error));
  return data as TruthDarePlayer | null;
}

export async function configureTruthDareRoom(
  roomId: string,
  packs: TruthDarePack[],
  maxTurns: number
) {
  const { error } = await supabase.rpc("configure_truth_dare_room", {
    p_room_id: roomId,
    p_packs: packs,
    p_max_turns: maxTurns,
  });
  if (error) throw new Error(message(error));
}

export async function startTruthDareGame(roomId: string) {
  const { error } = await supabase.rpc("start_truth_dare_game", {
    p_room_id: roomId,
  });
  if (error) throw new Error(message(error));
}

export async function kickTruthDarePlayer(
  roomId: string,
  playerId: string
) {
  const { error } = await supabase.rpc("kick_truth_dare_player", {
    p_room_id: roomId,
    p_player_id: playerId,
  });
  if (error) throw new Error(message(error));
}

export async function chooseTruthOrDare(
  roomId: string,
  choice: "TRUTH" | "DARE"
) {
  const { data, error } = await supabase.rpc("choose_truth_or_dare", {
    p_room_id: roomId,
    p_choice: choice,
  });
  if (error) throw new Error(message(error));
  return data as {
    prompt_id: number;
    choice: "TRUTH" | "DARE";
    pack: TruthDarePack;
    text_hr: string;
    text_en: string;
  };
}

export async function getTruthDarePrompt(promptId: number) {
  const { data, error } = await supabase
    .from("truth_dare_prompts")
    .select("id,prompt_type,pack,text_hr,text_en")
    .eq("id", promptId)
    .single();
  if (error) throw new Error(message(error));
  return data as TruthDarePrompt;
}

export async function finishTruthDareTurn(
  roomId: string,
  completed: boolean
) {
  const { error } = await supabase.rpc("finish_truth_dare_turn", {
    p_room_id: roomId,
    p_completed: completed,
  });
  if (error) throw new Error(message(error));
}

export async function restartTruthDareGame(roomId: string) {
  const { data, error } = await supabase.rpc("restart_truth_dare_game", {
    p_room_id: roomId,
  });
  if (error) throw new Error(message(error));
  return data as { status: "waiting"; code: string };
}