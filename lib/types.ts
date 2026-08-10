export type RoomStatus =
  | "waiting"
  | "question"
  | "answering"
  | "voting"
  | "reveal"
  | "leaderboard"
  | "ended";

export type Intensity =
  | "FRIENDLY"
  | "CHAOTIC"
  | "SAVAGE";

export type QuestionPack =
  | "CLASSIC"
  | "PARTY"
  | "GAMING"
  | "COUPLES"
  | "ADULT"
  | "DRINKING"
  | "MOVIES"
  | "MUSIC"
  | "SPORTS"
  | "GEOGRAPHY"
  | "MEMES"
  | "INTERNET"
  | "KIDS"
  | "FAMILY"
  | "RANDOM";

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  host_user_id: string;

  current_round: number;
  total_rounds: number;

  question_time: number;

  question_pack: QuestionPack;
  intensity: Intensity;

  used_question_ids: number[];
  used_suspect_player_ids: string[];

  suspect_player_id: string | null;
  current_round_id: string | null;

  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  user_id: string;

  nickname: string;
  avatar: string;

  is_host: boolean;

  score: number;

  // Game statistics
  times_suspect: number;
  times_caught: number;
  times_escaped: number;
  correct_votes: number;
  wrong_votes: number;

  is_ready: boolean;
  has_answered: boolean;
  is_connected: boolean;

  joined_at: string;
}

export interface PlayerProfile {
  user_id: string;
  nickname: string;
  avatar: string;

  games_played: number;
  wins: number;

  times_suspect: number;
  times_caught: number;
  times_escaped: number;

  correct_votes: number;
  wrong_votes: number;

  best_score: number;

  created_at: string;
  updated_at: string;
}

export interface Question {
  id: number;
  category: string;
  question_pack: Exclude<QuestionPack, "RANDOM">;

  normal_question: string;
  suspect_question: string;

  normal_question_hr?: string | null;
  suspect_question_hr?: string | null;

  intensity?: Intensity;
}

export interface RoundRow {
  id: string;
  room_id: string;
  round_number: number;
  question_id: number;

  status:
    | "question"
    | "answering"
    | "voting"
    | "reveal";

  scored?: boolean;
  suspect_caught?: boolean | null;
  correct_vote_count?: number;

  created_at: string;
}

export interface RoundQuestion {
  id: string;
  round_id: string;
  player_id: string;
  question_text: string;
  is_suspect: boolean;
}

export interface Vote {
  id: string;
  round_id: string;
  voter_player_id: string;
  voted_for_player_id: string;
}

export interface QuestionPair {
  id: number;
  normalQuestion: string;
  suspectQuestion: string;

  category:
    | "FUNNY"
    | "PARTY"
    | "FRIENDS"
    | "EMBARRASSING"
    | "DATING"
    | "CHAOS"
    | "RANDOM";

  difficulty:
    | "easy"
    | "medium"
    | "hard";
}