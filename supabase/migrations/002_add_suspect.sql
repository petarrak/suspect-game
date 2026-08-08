-- ============================================================
-- SUSPECT — Migration 002: Suspect assignment
-- Run this in Supabase SQL Editor. This is ADDITIVE ONLY —
-- it does not drop or touch existing rooms/players tables or data.
-- Do NOT re-run supabase/schema.sql, that file starts with
-- DROP TABLE and would wipe your working lobby data.
-- ============================================================

alter table rooms
  add column if not exists suspect_player_id uuid references players(id);

-- No new RLS policies needed: rooms is already readable by everyone
-- (rooms_select_all) and updatable only by the host (rooms_update_host_only),
-- and suspect_player_id is just a new column on that same row.
