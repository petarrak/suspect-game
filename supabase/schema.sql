-- ============================================================
-- SUSPECT — Supabase schema (Step 1: rooms, players, lobby)
-- Run this in Supabase: Project -> SQL Editor -> New query ->
-- paste this whole file -> Run.
--
-- This covers everything needed for: create room, join room,
-- the realtime lobby, and starting a game. Tables for rounds,
-- questions, and voting will be added in the next build step.
-- ============================================================

-- Clean start (safe to re-run while developing)
drop table if exists players cascade;
drop table if exists rooms cascade;

-- ---------------------------------------------------------
-- ROOMS
-- ---------------------------------------------------------
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'waiting'
    check (status in ('waiting','question','answering','voting','reveal','leaderboard','ended')),
  host_user_id uuid not null,
  current_round int not null default 0,
  total_rounds int not null default 5,
  intensity text not null default 'FRIENDLY'
    check (intensity in ('FRIENDLY','CHAOTIC','SAVAGE')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- PLAYERS
-- ---------------------------------------------------------
create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null,
  nickname text not null,
  is_host boolean not null default false,
  score int not null default 0,
  is_ready boolean not null default false,
  has_answered boolean not null default false,
  is_connected boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (room_id, nickname),
  unique (room_id, user_id)
);

-- ---------------------------------------------------------
-- ENABLE RLS
-- ---------------------------------------------------------
alter table rooms enable row level security;
alter table players enable row level security;

-- ---------------------------------------------------------
-- ROOMS policies
-- Anyone signed in (anonymous auth included) can read/create rooms.
-- Only the host can update their own room (e.g. to start the game).
-- ---------------------------------------------------------
create policy "rooms_select_all" on rooms
  for select using (true);

create policy "rooms_insert_authenticated" on rooms
  for insert with check (auth.uid() = host_user_id);

create policy "rooms_update_host_only" on rooms
  for update using (auth.uid() = host_user_id);

-- ---------------------------------------------------------
-- PLAYERS policies
-- Everyone in a room can see the (public) player list.
-- A player can only insert/update their own row.
-- ---------------------------------------------------------
create policy "players_select_all" on players
  for select using (true);

create policy "players_insert_self" on players
  for insert with check (auth.uid() = user_id);

create policy "players_update_self" on players
  for update using (auth.uid() = user_id);

-- ============================================================
-- REALTIME
-- Make sure these tables broadcast changes to subscribed clients,
-- which is what makes the lobby update live on every phone.
-- ============================================================
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
