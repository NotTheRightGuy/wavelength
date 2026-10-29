-- Writes happen only via security-definer RPCs (run as owner). TRUNCATE ignores RLS.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon, authenticated;

create function _require_host(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from rooms where id = p_room and host_session = auth.uid()) then
    raise exception 'host only';
  end if;
end $$;

create function create_room(p_mode text, p_winning int, p_laps int, p_timer int) returns text
language plpgsql security definer set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code text;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  loop
    v_code := '';
    for i in 1..4 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from rooms where code = v_code);
  end loop;
  insert into rooms (code, host_session, mode, winning_score, laps, timer_secs)
  values (v_code, auth.uid(), p_mode, coalesce(p_winning, 10), coalesce(p_laps, 2), p_timer);
  return v_code;
end $$;

create function join_room(p_code text, p_name text, p_color text, p_members text[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r rooms;
  v_seat uuid;
  v_count int;
  v_max int;
begin
  select * into r from rooms where code = upper(p_code) for update;
  if not found then raise exception 'room not found'; end if;
  select id into v_seat from seats where room_id = r.id and session_id = auth.uid();
  if found then return v_seat; end if; -- rejoin
  if r.status <> 'lobby' then raise exception 'game already started'; end if;
  select count(*) into v_count from seats where room_id = r.id;
  v_max := case r.mode when 'teams' then 6 else 12 end;
  if v_count >= v_max then raise exception 'room is full'; end if;
  insert into seats (room_id, session_id, position, name, color, members)
  values (r.id, auth.uid(),
          (select coalesce(max(position) + 1, 0) from seats where room_id = r.id), p_name, p_color,
          case r.mode when 'free' then array[p_name] else coalesce(p_members, '{}') end)
  returning id into v_seat;
  update rooms set last_active = now() where id = r.id;
  return v_seat;
end $$;

create function join_as_viewer(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_room uuid;
begin
  select id into v_room from rooms where code = upper(p_code);
  if v_room is null then raise exception 'room not found'; end if;
  insert into viewers (room_id, session_id) values (v_room, auth.uid()) on conflict do nothing;
  return v_room;
end $$;

create function update_seat(p_seat uuid, p_name text, p_members text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  update seats set name = p_name,
    members = case (select mode from rooms where id = seats.room_id)
                when 'free' then array[p_name] else p_members end
  where id = p_seat and session_id = auth.uid()
    and exists (select 1 from rooms where id = seats.room_id and status = 'lobby');
end $$;

create function kick_seat(p_seat uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_room uuid;
begin
  select room_id into v_room from seats where id = p_seat;
  perform _require_host(v_room);
  perform 1 from rooms where id = v_room for update;
  if not exists (select 1 from rooms where id = v_room and status = 'lobby') then
    raise exception 'cannot kick after start';
  end if;
  delete from seats where id = p_seat;
end $$;

create function transfer_host(p_room uuid, p_session uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _require_host(p_room);
  if not exists (select 1 from seats where room_id = p_room and session_id = p_session)
     and not exists (select 1 from viewers where room_id = p_room and session_id = p_session) then
    raise exception 'new host must be in the room';
  end if;
  update rooms set host_session = p_session where id = p_room;
end $$;

create function new_round(p_room uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r rooms;
  v_seat seats;
  v_number int;
  v_round uuid;
  v_options int[];
  v_psychic text;
begin
  select * into r from rooms where id = p_room;
  select coalesce(max(number), 0) + 1 into v_number from rounds where room_id = p_room;
  if r.mode = 'teams' then
    select * into v_seat from seats where id = (r.game->>'active')::uuid;
  else
    select * into v_seat from seats where room_id = p_room
      order by position offset ((v_number - 1) % (select count(*) from seats where room_id = p_room)) limit 1;
  end if;
  v_psychic := v_seat.members[(v_seat.turns_taken % greatest(cardinality(v_seat.members), 1)) + 1];
  update seats set turns_taken = turns_taken + 1 where id = v_seat.id;
  select array_agg(id) into v_options from (
    select id from cards where room_id is null or room_id = p_room order by random() limit 2
  ) c;
  insert into rounds (room_id, number, seat_id, psychic_name, card_options)
  values (p_room, v_number, v_seat.id, coalesce(v_psychic, v_seat.name), v_options)
  returning id into v_round;
  return v_round;
end $$;

create function start_game(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r rooms;
  v_count int;
  v_first uuid;
begin
  perform _require_host(p_room);
  select * into r from rooms where id = p_room for update;
  select count(*) into v_count from seats where room_id = p_room;
  if r.status <> 'lobby' then raise exception 'already started'; end if;
  if r.mode = 'teams' and v_count < 2 then raise exception 'need at least 2 teams'; end if;
  if r.mode = 'free' and v_count < 3 then raise exception 'need at least 3 players'; end if;
  if r.mode = 'teams' and exists (select 1 from seats where room_id = p_room and cardinality(members) = 0) then
    raise exception 'every team needs at least one member';
  end if;
  select id into v_first from seats where room_id = p_room order by position limit 1;
  update rooms set status = 'playing', last_active = now(),
    game = jsonb_build_object('phase', 'playing', 'active', v_first, 'winners', '[]'::jsonb)
  where id = p_room;
  perform new_round(p_room);
end $$;

-- Snapshot for clients. Gating rule: anyone holding the room code gets room
-- (minus host_session), is_host, my_seat and seats (minus session_id). round,
-- cards and guesses are returned only if is_room_member(room). guesses mirror
-- the guesses_read RLS rule: teams -> all rows of the current round; free ->
-- only the caller's own seat unless phase = 'reveal'. Never exposes
-- round_secrets, host_session or session_id.
create function get_room_state(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r rooms;
  v_round rounds;
  v_member boolean;
begin
  select * into r from rooms where code = upper(p_code);
  if not found then return null; end if;
  v_member := is_room_member(r.id);
  if v_member then
    select * into v_round from rounds where room_id = r.id order by number desc limit 1;
  end if;
  return jsonb_build_object(
    'room', to_jsonb(r) - 'host_session',
    'is_host', r.host_session = auth.uid(),
    'my_seat', (select id from seats where room_id = r.id and session_id = auth.uid()),
    'seats', coalesce((select jsonb_agg(to_jsonb(s) - 'session_id' order by s.position) from seats s where s.room_id = r.id), '[]'),
    'round', case when v_member then to_jsonb(v_round) else null end,
    'cards', case when v_member then coalesce((select jsonb_agg(to_jsonb(c)) from cards c where c.id = any(v_round.card_options) or c.id = v_round.card_id), '[]') else '[]'::jsonb end,
    'guesses', case when v_member then coalesce((
        select jsonb_agg(to_jsonb(g)) from guesses g
        where g.round_id = v_round.id
          and (r.mode = 'teams' or v_round.phase = 'reveal'
               or exists (select 1 from seats s where s.id = g.seat_id and s.session_id = auth.uid()))
      ), '[]') else '[]'::jsonb end
  );
end $$;


-- Function privileges: PUBLIC can execute by default, so revoke explicitly.
revoke execute on function new_round(uuid) from public, anon, authenticated;
revoke execute on function _require_host(uuid) from public, anon, authenticated;
revoke execute on function create_room(text,int,int,int) from public, anon;
revoke execute on function join_room(text,text,text,text[]) from public, anon;
revoke execute on function join_as_viewer(text) from public, anon;
revoke execute on function update_seat(uuid,text,text[]) from public, anon;
revoke execute on function start_game(uuid) from public, anon;
revoke execute on function kick_seat(uuid) from public, anon;
revoke execute on function transfer_host(uuid,uuid) from public, anon;
revoke execute on function get_room_state(text) from public, anon;
grant execute on function create_room(text,int,int,int) to authenticated;
grant execute on function join_room(text,text,text,text[]) to authenticated;
grant execute on function join_as_viewer(text) to authenticated;
grant execute on function update_seat(uuid,text,text[]) to authenticated;
grant execute on function start_game(uuid) to authenticated;
grant execute on function kick_seat(uuid) to authenticated;
grant execute on function transfer_host(uuid,uuid) to authenticated;
grant execute on function get_room_state(text) to authenticated;
