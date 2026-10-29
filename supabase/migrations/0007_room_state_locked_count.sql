-- locked_count: number of guesses with a dial in a round, exposed through
-- get_room_state to room members only so free-play clients can show progress
-- without reading other players' (hidden) guess rows.
create function locked_count(p_round uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from guesses where round_id = p_round and dial is not null
$$;
revoke execute on function locked_count(uuid) from public, anon;
grant execute on function locked_count(uuid) to authenticated;

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
    'seats', coalesce((select jsonb_agg(to_jsonb(s) - 'session_id' order by s.position) from seats s where s.room_id = r.id), '[]'),
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
