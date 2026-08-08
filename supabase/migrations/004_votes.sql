-- ============================================================
-- SUSPECT — Migration 004: Votes (Voting Phase)
-- Run this in Supabase SQL Editor. Additive only — does not
-- touch rooms/players/rounds/round_questions data.
-- ============================================================

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  voter_player_id uuid not null references players(id) on delete cascade,
  voted_for_player_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (round_id, voter_player_id)
);

-- NOTE: players MAY vote for themselves in this game, so there is
-- intentionally no check constraint preventing
-- voter_player_id = voted_for_player_id.

alter table votes enable row level security;

-- Any player who belongs to the room (via the round) can see all
-- votes for that round. This is what powers the live
-- "Votes submitted: X/Y" counter and lets a player who refreshes
-- see that their own vote is already locked in.
drop policy if exists "votes_select_room_members" on votes;
create policy "votes_select_room_members" on votes
  for select using (
    exists (
      select 1 from rounds rd
      join players p on p.room_id = rd.room_id
      where rd.id = votes.round_id and p.user_id = auth.uid()
    )
  );

-- A player can only ever insert a vote as themselves. The unique
-- constraint above (round_id, voter_player_id) is what actually
-- prevents double-voting at the database level.
drop policy if exists "votes_insert_self" on votes;
create policy "votes_insert_self" on votes
  for insert with check (
    exists (
      select 1 from players p
      where p.id = votes.voter_player_id and p.user_id = auth.uid()
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table votes;
