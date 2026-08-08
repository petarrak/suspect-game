-- ============================================================
-- SUSPECT — Migration 005: Scoring
-- Additive only.
-- ============================================================

alter table rounds
add column if not exists scoring_applied boolean not null default false;


create or replace function apply_round_scoring(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
  v_round rounds%rowtype;
  v_player_count integer;
  v_correct_votes integer;
begin

  -- Get room
  select *
  into v_room
  from rooms
  where id = p_room_id;

  if not found then
    raise exception 'Room not found';
  end if;

  -- Only the host may apply scoring
  if v_room.host_user_id <> auth.uid() then
    raise exception 'Only the host can apply scoring';
  end if;

  if v_room.current_round_id is null then
    raise exception 'Room has no current round';
  end if;

  if v_room.status <> 'reveal' then
    raise exception 'Scoring can only happen during reveal';
  end if;

  -- Lock round so scoring cannot run twice
  select *
  into v_round
  from rounds
  where id = v_room.current_round_id
  for update;

  if v_round.scoring_applied then
    return;
  end if;

  select count(*)
  into v_player_count
  from players
  where room_id = p_room_id;

  select count(*)
  into v_correct_votes
  from votes
  where round_id = v_room.current_round_id
    and voted_for_player_id = v_room.suspect_player_id;

  -- +1 for every correct voter
  update players p
  set score = score + 1
  where p.id in (
    select v.voter_player_id
    from votes v
    where v.round_id = v_room.current_round_id
      and v.voted_for_player_id = v_room.suspect_player_id
  );

  -- Suspect gets +2 if the group did NOT get a majority
  if v_correct_votes <= (v_player_count / 2.0) then
    update players
    set score = score + 2
    where id = v_room.suspect_player_id;
  end if;

  update rounds
  set scoring_applied = true
  where id = v_room.current_round_id;

end;
$$;

grant execute on function apply_round_scoring(uuid) to authenticated;