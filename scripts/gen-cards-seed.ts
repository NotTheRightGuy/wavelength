import { writeFileSync } from 'node:fs'
import { CARDS } from '../src/data/cards'

const esc = (s: string) => s.replace(/'/g, "''")
const rows = CARDS.map((c) => `  ('${esc(c.left)}', '${esc(c.right)}')`).join(',\n')

const head = `-- Retire the generic built-in deck and seed the new one.
-- Old built-ins stay in the table (rounds.card_id references them) but are never drawn.
alter table cards add column active boolean not null default true;
update cards set active = false where room_id is null;

`
const tail = `
-- Draw only active built-in cards plus the room's own custom cards.
create or replace function new_round(p_room uuid) returns uuid
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
    select id from cards where active and (room_id is null or room_id = p_room) order by random() limit 2
  ) c;
  insert into rounds (room_id, number, seat_id, psychic_name, card_options)
  values (p_room, v_number, v_seat.id, coalesce(v_psychic, v_seat.name), v_options)
  returning id into v_round;
  return v_round;
end $$;

revoke execute on function new_round(uuid) from public, anon, authenticated;
`
writeFileSync(
  'supabase/migrations/0009_new_card_deck.sql',
  `${head}insert into cards (left_label, right_label) values\n${rows};\n${tail}`,
)
