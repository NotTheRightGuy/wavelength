-- Host-only extras: seat session ids are exposed to the host (needed to pass host
-- control), and the host can end the game early.
create or replace function get_room_state(p_code text) returns jsonb
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
    'seats', coalesce((select jsonb_agg(case when r.host_session = auth.uid() then to_jsonb(s) else to_jsonb(s) - 'session_id' end order by s.position) from seats s where s.room_id = r.id), '[]'),
    'round', case when v_member then to_jsonb(v_round) else null end,
    'cards', case when v_member then coalesce((select jsonb_agg(to_jsonb(c)) from cards c where c.id = any(v_round.card_options) or c.id = v_round.card_id), '[]') else '[]'::jsonb end,
    'guesses', case when v_member then coalesce((
        select jsonb_agg(to_jsonb(g)) from guesses g
        where g.round_id = v_round.id
          and (r.mode = 'teams' or v_round.phase = 'reveal'
               or exists (select 1 from seats s where s.id = g.seat_id and s.session_id = auth.uid()))
      ), '[]') else '[]'::jsonb end,
    'locked_count', case when v_member and v_round.id is not null then locked_count(v_round.id) else null end
  );
end $$;

revoke execute on function get_room_state(text) from public, anon;
grant execute on function get_room_state(text) to authenticated;

create function end_game(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_top int; v_winners uuid[];
begin
  perform _require_host(p_room);
  select max(score) into v_top from seats where room_id = p_room;
  select coalesce(array_agg(id), '{}') into v_winners from seats where room_id = p_room and score = v_top;
  update rooms set status = 'finished', last_active = now(),
    game = game || jsonb_build_object('phase', 'finished', 'winners', to_jsonb(v_winners))
  where id = p_room;
end $$;

revoke execute on function end_game(uuid) from public, anon;
grant execute on function end_game(uuid) to authenticated;
