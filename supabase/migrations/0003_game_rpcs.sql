-- Gameplay RPCs. All run as owner (security definer); clients only get EXECUTE
-- on the public-facing ones at the bottom of this file.

create function band_points(p_target numeric, p_dial numeric) returns int
language sql immutable as $$
  select case
    when abs(p_target - p_dial) <= 2 then 4
    when abs(p_target - p_dial) <= 6 then 3
    when abs(p_target - p_dial) <= 10 then 2
    else 0 end;
$$;

create function _next_seat(p_room uuid, p_seat uuid) returns uuid
language sql stable as $$
  select coalesce(
    (select id from seats where room_id = p_room and position > (select position from seats where id = p_seat) order by position limit 1),
    (select id from seats where room_id = p_room order by position limit 1));
$$;

create function _sd_state(p_room uuid, p_leaders uuid[]) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'phase', 'sudden_death',
    'sd_tied', to_jsonb(p_leaders),
    'sd_pending', to_jsonb(p_leaders),
    'active', p_leaders[1],
    'sd_start', (select jsonb_object_agg(id::text, score) from seats where room_id = p_room));
$$;

-- Mirrors src/game-engine/team.ts applyTurn.
create function apply_team_turn(p_room uuid, p_dial_pts int, p_bonus uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare
  r rooms; g jsonb; v_active uuid; v_phase text;
  v_active_score int; v_best_other int; v_top int;
  v_leaders uuid[]; v_pending uuid[];
begin
  select * into r from rooms where id = p_room for update;
  g := r.game; v_active := (g->>'active')::uuid; v_phase := g->>'phase';

  update seats set score = score + p_dial_pts where id = v_active;
  update seats set score = score + 1
   where room_id = p_room and id = any(p_bonus) and id <> v_active
     and (v_phase <> 'sudden_death' or id::text in (select jsonb_array_elements_text(g->'sd_tied')));

  if v_phase = 'sudden_death' then
    v_pending := array(select x::uuid from jsonb_array_elements_text(g->'sd_pending') x where x::uuid <> v_active);
    if cardinality(v_pending) > 0 then
      g := g || jsonb_build_object('sd_pending', to_jsonb(v_pending), 'active', v_pending[1]);
    else
      with gains as (
        select s.id, s.position, s.score - (g->'sd_start'->>(s.id::text))::int as gain
        from seats s
        where s.room_id = p_room and s.id::text in (select jsonb_array_elements_text(g->'sd_tied'))
      )
      select array_agg(id order by position) into v_leaders from gains where gain = (select max(gain) from gains);
      if cardinality(v_leaders) = 1 then
        g := g || jsonb_build_object('phase', 'finished', 'winners', to_jsonb(v_leaders), 'sd_pending', '[]'::jsonb);
      else
        g := g || _sd_state(p_room, v_leaders);
      end if;
    end if;
  else
    select score into v_active_score from seats where id = v_active;
    select max(score) into v_best_other from seats where room_id = p_room and id <> v_active;
    if p_dial_pts = 4 and v_active_score < v_best_other then
      null; -- catch-up turn: same team goes again
    else
      select max(score) into v_top from seats where room_id = p_room;
      if v_top >= r.winning_score then
        select array_agg(id order by position) into v_leaders from seats where room_id = p_room and score = v_top;
        if cardinality(v_leaders) = 1 then
          g := g || jsonb_build_object('phase', 'finished', 'winners', to_jsonb(v_leaders));
        else
          g := g || _sd_state(p_room, v_leaders);
        end if;
      else
        g := g || jsonb_build_object('active', _next_seat(p_room, v_active));
      end if;
    end if;
  end if;

  update rooms set game = g,
    status = case when g->>'phase' = 'finished' then 'finished' else status end,
    last_active = now()
  where id = p_room;
end $$;

create function _round_for_active(p_round uuid, p_phase text) returns rounds
language plpgsql security definer set search_path = public as $$
declare v rounds;
begin
  select r.* into v from rounds r join seats s on s.id = r.seat_id
   where r.id = p_round and s.session_id = auth.uid() for update of r;
  if not found then raise exception 'not your turn'; end if;
  if v.phase <> p_phase then raise exception 'wrong phase: %', v.phase; end if;
  return v;
end $$;

create function pick_card(p_round uuid, p_card int) returns void
language plpgsql security definer set search_path = public as $$
declare v rounds;
begin
  v := _round_for_active(p_round, 'card_pick');
  if not (p_card = any(v.card_options)) then raise exception 'card not offered'; end if;
  -- The target lives ONLY in round_secrets until _reveal_round writes rounds.result.
  insert into round_secrets (round_id, target) values (p_round, round((10 + random() * 80)::numeric, 2));
  update rounds set card_id = p_card, phase = 'spin' where id = p_round;
end $$;

create function finish_spin(p_round uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _round_for_active(p_round, 'spin');
  update rounds set phase = 'clue' where id = p_round;
end $$;

create function submit_clue(p_round uuid, p_clue text) returns void
language plpgsql security definer set search_path = public as $$
declare v rounds; v_timer int;
begin
  v := _round_for_active(p_round, 'clue');
  select timer_secs into v_timer from rooms where id = v.room_id;
  update rounds set clue = nullif(trim(p_clue), ''), phase = 'dial',
    dial_deadline = case when v_timer is null then null else now() + make_interval(secs => v_timer) end
  where id = p_round;
end $$;

create function get_target(p_round uuid) returns numeric
language sql stable security invoker set search_path = public as $$
  select target from round_secrets where round_id = p_round; -- RLS decides
$$;

-- Internal: scores the round and writes rounds.result. No client grant.
create function _reveal_round(p_round uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v rounds; r rooms; v_target numeric;
  v_entries jsonb; v_dial_pts int := 0; v_bonus uuid[]; v_psychic_pts int := 0;
begin
  select * into v from rounds where id = p_round for update;
  if not found then raise exception 'round not found'; end if;
  if v.phase = 'reveal' then return; end if;
  select * into r from rooms where id = v.room_id;
  select target into v_target from round_secrets where round_id = p_round;

  if r.mode = 'teams' then
    select coalesce(band_points(v_target, g.dial), 0) into v_dial_pts
      from guesses g where g.round_id = p_round and g.seat_id = v.seat_id;
    v_dial_pts := coalesce(v_dial_pts, 0);
    select array_agg(g.seat_id) into v_bonus
      from guesses g join guesses ag on ag.round_id = g.round_id and ag.seat_id = v.seat_id
     where g.round_id = p_round and g.seat_id <> v.seat_id and ag.dial is not null
       and g.lr is not null and v_target <> ag.dial
       and g.lr = case when v_target < ag.dial then 'left' else 'right' end;
    select jsonb_agg(jsonb_build_object(
        'seat_id', g.seat_id, 'dial', g.dial, 'lr', g.lr,
        'points', case when g.seat_id = v.seat_id then v_dial_pts else 0 end,
        'lr_correct', g.seat_id = any(coalesce(v_bonus, '{}'))))
      into v_entries from guesses g where g.round_id = p_round;
    update rounds set phase = 'reveal', result = jsonb_build_object(
      'target', v_target, 'dial_points', v_dial_pts, 'entries', coalesce(v_entries, '[]'), 'psychic_points', 0)
    where id = p_round;
    perform apply_team_turn(r.id, v_dial_pts, coalesce(v_bonus, '{}'));
  else
    select jsonb_agg(jsonb_build_object('seat_id', g.seat_id, 'dial', g.dial, 'lr', null,
             'points', band_points(v_target, g.dial), 'lr_correct', false)),
           coalesce(round(avg(band_points(v_target, g.dial))), 0)::int
      into v_entries, v_psychic_pts from guesses g where g.round_id = p_round and g.dial is not null;
    update seats set score = score + band_points(v_target, g.dial)
      from guesses g where g.round_id = p_round and g.seat_id = seats.id and g.dial is not null;
    update seats set score = score + v_psychic_pts where id = v.seat_id;
    update rounds set phase = 'reveal', result = jsonb_build_object(
      'target', v_target, 'dial_points', 0, 'entries', coalesce(v_entries, '[]'), 'psychic_points', v_psychic_pts)
    where id = p_round;
    update rooms set last_active = now() where id = r.id;
  end if;
end $$;

-- Client-callable, host only: force the reveal (e.g. when the dial timer expires).
create function reveal_round(p_round uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v rounds;
begin
  select * into v from rounds where id = p_round;
  if not found then raise exception 'round not found'; end if;
  perform _require_host(v.room_id);
  if v.phase not in ('dial', 'lr') then raise exception 'cannot reveal yet'; end if;
  perform _reveal_round(p_round);
end $$;

create function lock_dial(p_round uuid, p_dial numeric) returns void
language plpgsql security definer set search_path = public as $$
declare v rounds; r rooms; v_seat seats; v_needed int; v_locked int;
begin
  if p_dial is null then raise exception 'dial required'; end if;
  select * into v from rounds where id = p_round for update;
  if not found then raise exception 'round not found'; end if;
  select * into r from rooms where id = v.room_id;
  select * into v_seat from seats where room_id = r.id and session_id = auth.uid();
  if v_seat.id is null then raise exception 'not seated'; end if;
  if v.phase <> 'dial' then raise exception 'wrong phase: %', v.phase; end if;
  if r.mode = 'teams' and v_seat.id <> v.seat_id then raise exception 'only the active team sets the dial'; end if;
  if r.mode = 'free' and v_seat.id = v.seat_id then raise exception 'the psychic does not guess'; end if;
  if r.mode = 'free' and exists (
    select 1 from guesses where round_id = p_round and seat_id = v_seat.id and dial is not null
  ) then raise exception 'already locked'; end if;
  insert into guesses (round_id, seat_id, dial) values (p_round, v_seat.id, p_dial)
    on conflict (round_id, seat_id) do update set dial = excluded.dial;
  if r.mode = 'teams' then
    update rounds set phase = 'lr' where id = p_round;
  else
    select count(*) into v_needed from seats where room_id = r.id and id <> v.seat_id;
    select count(*) into v_locked from guesses where round_id = p_round and dial is not null;
    if v_locked >= v_needed then perform _reveal_round(p_round); end if;
  end if;
end $$;

create function lock_lr(p_round uuid, p_guess text) returns void
language plpgsql security definer set search_path = public as $$
declare v rounds; r rooms; v_seat seats; v_needed int; v_locked int;
begin
  if p_guess is null then raise exception 'guess required'; end if;
  select * into v from rounds where id = p_round for update;
  if not found then raise exception 'round not found'; end if;
  select * into r from rooms where id = v.room_id;
  select * into v_seat from seats where room_id = r.id and session_id = auth.uid();
  if r.mode <> 'teams' or v.phase <> 'lr' or v_seat.id is null or v_seat.id = v.seat_id then
    raise exception 'cannot guess left/right now';
  end if;
  insert into guesses (round_id, seat_id, lr) values (p_round, v_seat.id, p_guess)
    on conflict (round_id, seat_id) do update set lr = excluded.lr;
  select count(*) into v_needed from seats where room_id = r.id and id <> v.seat_id;
  select count(*) into v_locked from guesses where round_id = p_round and seat_id <> v.seat_id and lr is not null;
  if v_locked >= v_needed then perform _reveal_round(p_round); end if;
end $$;

create function next_turn(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rooms; v_rounds int; v_seats int; v_top int; v_winners uuid[];
begin
  perform _require_host(p_room);
  select * into r from rooms where id = p_room for update;
  if r.game->>'phase' = 'finished' then return; end if;
  if not exists (select 1 from rounds where room_id = p_room and phase = 'reveal'
                 and number = (select max(number) from rounds where room_id = p_room)) then
    raise exception 'round not revealed yet';
  end if;
  if r.mode = 'free' then
    select count(*) into v_rounds from rounds where room_id = p_room;
    select count(*) into v_seats from seats where room_id = p_room;
    if v_rounds >= r.laps * v_seats then
      select max(score) into v_top from seats where room_id = p_room;
      select array_agg(id order by position) into v_winners from seats where room_id = p_room and score = v_top;
      update rooms set status = 'finished', game = game || jsonb_build_object('phase', 'finished', 'winners', to_jsonb(v_winners))
      where id = p_room;
      return;
    end if;
  end if;
  perform new_round(p_room);
end $$;

create function rematch(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_first uuid; r rooms;
begin
  perform _require_host(p_room);
  select * into r from rooms where id = p_room for update;
  if r.status <> 'finished' then raise exception 'rematch only after the game ends'; end if;
  delete from rounds where room_id = p_room;
  update seats set score = 0, turns_taken = 0 where room_id = p_room;
  select id into v_first from seats where room_id = p_room order by position limit 1;
  update rooms set status = 'playing', last_active = now(),
    game = jsonb_build_object('phase', 'playing', 'active', v_first, 'winners', '[]'::jsonb)
  where id = p_room;
  perform new_round(p_room);
end $$;

-- Privileges: PUBLIC can execute new functions by default, so revoke explicitly.
revoke execute on function pick_card(uuid,int) from public, anon;
revoke execute on function finish_spin(uuid) from public, anon;
revoke execute on function submit_clue(uuid,text) from public, anon;
revoke execute on function get_target(uuid) from public, anon;
revoke execute on function reveal_round(uuid) from public, anon;
revoke execute on function lock_dial(uuid,numeric) from public, anon;
revoke execute on function lock_lr(uuid,text) from public, anon;
revoke execute on function next_turn(uuid) from public, anon;
revoke execute on function rematch(uuid) from public, anon;
grant execute on function pick_card(uuid,int) to authenticated;
grant execute on function finish_spin(uuid) to authenticated;
grant execute on function submit_clue(uuid,text) to authenticated;
grant execute on function get_target(uuid) to authenticated;
grant execute on function reveal_round(uuid) to authenticated;
grant execute on function lock_dial(uuid,numeric) to authenticated;
grant execute on function lock_lr(uuid,text) to authenticated;
grant execute on function next_turn(uuid) to authenticated;
grant execute on function rematch(uuid) to authenticated;

revoke execute on function band_points(numeric,numeric) from public, anon, authenticated;
revoke execute on function _next_seat(uuid,uuid) from public, anon, authenticated;
revoke execute on function _sd_state(uuid,uuid[]) from public, anon, authenticated;
revoke execute on function apply_team_turn(uuid,int,uuid[]) from public, anon, authenticated;
revoke execute on function _round_for_active(uuid,text) from public, anon, authenticated;
revoke execute on function _reveal_round(uuid) from public, anon, authenticated;
