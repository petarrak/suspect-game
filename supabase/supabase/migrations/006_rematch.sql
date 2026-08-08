-- ============================================================
-- SUSPECT — Migration 006: Rematch / Play Again
-- ============================================================

create or replace function reset_game_for_rematch(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms%rowtype;
begin

  select *
  into v_room
  from rooms
  where id = p_room_id;

  if not found then
    raise exception 'Room not found';
  end if;

  if v_room.host_user_id <> auth.uid() then
    raise exception 'Only the host can start a rematch';
  end if;

  -- Reset game state but keep the same room + same players.
  update rooms
  set
    status = 'waiting',
    current_round = 0,
    suspect_player_id = null,
    current_round_id = null,
    used_question_ids = '{}'::int[]
  where id = p_room_id;

  -- Reset all players for a completely fresh game.
  update players
  set
    score = 0,
    is_ready = false,
    has_answered = false
  where room_id = p_room_id;

end;
$$;

grant execute on function reset_game_for_rematch(uuid) to authenticated;