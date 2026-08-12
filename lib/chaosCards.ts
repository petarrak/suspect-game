import { ensureAnonSession, supabase } from "@/lib/supabase";

export type ChaosMode = "PARTY" | "FUNNY" | "DRINKING" | "HOT" | "BRUTAL";
export type ChaosSuit = "HEARTS" | "DIAMONDS" | "CLUBS" | "SPADES" | "JOKER";

export interface ChaosRoom {
  id: string;
  code: string;
  host_user_id: string;
  status: "waiting" | "playing" | "ended";
  mode: ChaosMode;
  current_turn: number;
  max_turns: number;
  current_player_id: string | null;
  current_rule_id: number | null;
  current_suit: ChaosSuit | null;
}

export interface ChaosPlayer {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  avatar: string;
  is_host: boolean;
  is_connected: boolean;
  cards_drawn: number;
  joined_at: string;
}

export interface ChaosRule {
  id: number;
  card_rank: string;
  title_hr: string;
  title_en: string;
  rule_hr: string;
  rule_en: string;
}

function fail(error: { message?: string } | null) {
  return error?.message ?? "Something went wrong.";
}

export async function createChaosRoom(nickname: string, avatar: string) {
  await ensureAnonSession();
  const { data, error } = await supabase.rpc("create_chaos_cards_room", {
    p_nickname: nickname,
    p_avatar: avatar,
  });
  if (error) throw new Error(fail(error));
  return data as { room_id: string; code: string; player_id: string };
}

export async function joinChaosRoom(code: string, nickname: string, avatar: string) {
  await ensureAnonSession();
  const { data, error } = await supabase.rpc("join_chaos_cards_room", {
    p_code: code.trim().toUpperCase(),
    p_nickname: nickname,
    p_avatar: avatar,
  });
  if (error) throw new Error(fail(error));
  return data as { room_id: string; code: string; player_id: string };
}

export async function getChaosRoomByCode(code: string) {
  await ensureAnonSession();
  const { data, error } = await supabase.from("chaos_card_rooms").select("*").eq("code", code).single();
  if (error) throw new Error(fail(error));
  return data as ChaosRoom;
}

export async function getChaosRoom(roomId: string) {
  await ensureAnonSession();
  const { data, error } = await supabase.from("chaos_card_rooms").select("*").eq("id", roomId).single();
  if (error) throw new Error(fail(error));
  return data as ChaosRoom;
}

export async function getChaosPlayers(roomId: string) {
  const { data, error } = await supabase.from("chaos_card_players").select("*").eq("room_id", roomId).order("joined_at");
  if (error) throw new Error(fail(error));
  return (data ?? []) as ChaosPlayer[];
}

export async function getMyChaosPlayer(roomId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.from("chaos_card_players").select("*").eq("room_id", roomId).eq("user_id", auth.user.id).maybeSingle();
  if (error) throw new Error(fail(error));
  return data as ChaosPlayer | null;
}

export async function configureChaosRoom(roomId: string, mode: ChaosMode, turns: number) {
  const { error } = await supabase.rpc("configure_chaos_cards_room", {
    p_room_id: roomId,
    p_mode: mode,
    p_max_turns: turns,
  });
  if (error) throw new Error(fail(error));
}

export async function startChaosGame(roomId: string) {
  const { error } = await supabase.rpc("start_chaos_cards_game", { p_room_id: roomId });
  if (error) throw new Error(fail(error));
}

export async function kickChaosPlayer(roomId: string, playerId: string) {
  const { error } = await supabase.rpc("kick_chaos_card_player", {
    p_room_id: roomId,
    p_player_id: playerId,
  });
  if (error) throw new Error(fail(error));
}

export async function drawChaosCard(roomId: string) {
  const { data, error } = await supabase.rpc("draw_chaos_card", { p_room_id: roomId });
  if (error) throw new Error(fail(error));
  return data as {
    rule_id: number; rank: string; suit: ChaosSuit;
    title_hr: string; title_en: string; rule_hr: string; rule_en: string;
  };
}

export async function getChaosRule(ruleId: number) {
  const { data, error } = await supabase.from("chaos_card_rules")
    .select("id,card_rank,title_hr,title_en,rule_hr,rule_en").eq("id", ruleId).single();
  if (error) throw new Error(fail(error));
  return data as ChaosRule;
}

export async function finishChaosTurn(roomId: string) {
  const { error } = await supabase.rpc("finish_chaos_card_turn", { p_room_id: roomId });
  if (error) throw new Error(fail(error));
}

export async function restartChaosGame(roomId: string) {
  const { data, error } = await supabase.rpc("restart_chaos_cards_game", {
    p_room_id: roomId,
  });
  if (error) throw new Error(fail(error));
  return data as { status: "waiting"; code: string };
}