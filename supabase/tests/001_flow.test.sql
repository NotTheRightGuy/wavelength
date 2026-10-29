begin;
select plan(21);

create schema tests;
grant usage on schema tests to authenticated, anon;
create function tests.u(n int) returns uuid language sql immutable as
  $$ select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid $$;
create function tests.as_user(p_id uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

insert into auth.users (id, aud, role) select tests.u(n), 'authenticated', 'authenticated' from generate_series(1, 12) n;

create temp table ctx (k text primary key, v text);
grant all on ctx to authenticated, anon;

-- 1. room codes -------------------------------------------------------------
select tests.as_user(tests.u(1));
insert into ctx select 'code', create_room('teams', 10, 2, null);
select matches((select v from ctx where k = 'code'), '^[A-HJ-NP-Z]{4}$', '1. create_room returns a 4-letter code without I/O');

-- 2. idempotent join --------------------------------------------------------
select tests.as_user(tests.u(2));
insert into ctx select 'seat2', join_room((select v from ctx where k = 'code'), 'Red', '#e11', array['Sam', 'Ana']);
select is(join_room((select v from ctx where k = 'code'), 'Red', '#e11', array['Sam', 'Ana']),
  (select v::uuid from ctx where k = 'seat2'), '2. joining twice returns the same seat id');

-- 4a. start_game needs two teams; only the host may start ------------------------
reset role;
insert into ctx select 'room', id::text from rooms where code = (select v from ctx where k = 'code');
select tests.as_user(tests.u(1));
select throws_ok($$ select start_game((select v::uuid from ctx where k = 'room')) $$, 'need at least 2 teams', '4. start_game with one team raises');
select tests.as_user(tests.u(2));
select throws_ok($$ select start_game((select v::uuid from ctx where k = 'room')) $$, 'host only', '4. a non-host cannot start the game');

-- 3. a 7th team is rejected --------------------------------------------------
select tests.as_user(tests.u(3));
select join_room((select v from ctx where k = 'code'), 'T3', '#333', array['x']);
select tests.as_user(tests.u(4));
select join_room((select v from ctx where k = 'code'), 'T4', '#444', array['x']);
select tests.as_user(tests.u(5));
select join_room((select v from ctx where k = 'code'), 'T5', '#555', array['x']);
select tests.as_user(tests.u(6));
select join_room((select v from ctx where k = 'code'), 'T6', '#666', array['x']);
select tests.as_user(tests.u(7));
select join_room((select v from ctx where k = 'code'), 'T7', '#777', array['x']);
select tests.as_user(tests.u(8));
select throws_ok($$ select join_room((select v from ctx where k = 'code'), 'T8', '#888', array['x']) $$, 'room is full', '3. a 7th team is rejected');

-- host cleans the lobby back to two teams (also exercises kick_seat), then starts
select tests.as_user(tests.u(1));
select kick_seat(id) from seats where room_id = (select v::uuid from ctx where k = 'room') and name in ('T4', 'T5', 'T6', 'T7');
select is((select count(*)::int from seats where room_id = (select v::uuid from ctx where k = 'room')), 2, 'kick_seat removes teams in the lobby');
select start_game((select v::uuid from ctx where k = 'room'));
select throws_ok($$ select kick_seat((select v::uuid from ctx where k = 'seat2')) $$, 'cannot kick after start', 'kick_seat is lobby-only');
reset role;
insert into ctx select 'round', id::text from rounds where room_id = (select v::uuid from ctx where k = 'room') and number = 1;

-- 7. next_turn before the reveal ---------------------------------------------
select tests.as_user(tests.u(1));
select throws_ok($$ select next_turn((select v::uuid from ctx where k = 'room')) $$, 'round not revealed yet', '7. next_turn before the reveal raises');
select throws_ok($$ select reveal_round((select v::uuid from ctx where k = 'round')) $$, 'cannot reveal yet', 'reveal_round is not valid in card_pick');

-- 5. full team round -----------------------------------------------------------
select tests.as_user(tests.u(2));
select pick_card((select v::uuid from ctx where k = 'round'), (select card_options[1] from rounds where id = (select v::uuid from ctx where k = 'round')));
select finish_spin((select v::uuid from ctx where k = 'round'));
select submit_clue((select v::uuid from ctx where k = 'round'), 'a clue');
select throws_ok($$ select lock_dial((select v::uuid from ctx where k = 'round'), null) $$, 'dial required', 'lock_dial(null) raises');
select lock_dial((select v::uuid from ctx where k = 'round'), 50);
select tests.as_user(tests.u(3));
select throws_ok($$ select lock_lr((select v::uuid from ctx where k = 'round'), null) $$, 'guess required', 'lock_lr(null) raises');
select lock_lr((select v::uuid from ctx where k = 'round'), 'left');
select is((select phase from rounds where id = (select v::uuid from ctx where k = 'round')), 'reveal', '5. the round is revealed after dial + left/right');
reset role;
select is((select (result->>'target')::numeric from rounds where id = (select v::uuid from ctx where k = 'round')),
  (select target from round_secrets where round_id = (select v::uuid from ctx where k = 'round')), '5. result.target equals the secret');
select is((select score from seats where id = (select v::uuid from ctx where k = 'seat2')),
  band_points((select target from round_secrets where round_id = (select v::uuid from ctx where k = 'round')), 50), '5. the active seat scored band_points(target, 50)');

-- 6. free play -------------------------------------------------------------------
select tests.as_user(tests.u(1));
insert into ctx select 'fcode', create_room('free', 10, 1, null);
select tests.as_user(tests.u(9));
select join_room((select v from ctx where k = 'fcode'), 'P1', '#111', null);
select tests.as_user(tests.u(10));
select join_room((select v from ctx where k = 'fcode'), 'P2', '#222', null);
select tests.as_user(tests.u(11));
select join_room((select v from ctx where k = 'fcode'), 'P3', '#333', null);
select tests.as_user(tests.u(1));
select start_game((select id from rooms where code = (select v from ctx where k = 'fcode')));
reset role;
insert into ctx select 'fround', id::text from rounds where room_id = (select id from rooms where code = (select v from ctx where k = 'fcode'));
select tests.as_user(tests.u(9));
select pick_card((select v::uuid from ctx where k = 'fround'), (select card_options[1] from rounds where id = (select v::uuid from ctx where k = 'fround')));
select finish_spin((select v::uuid from ctx where k = 'fround'));
select submit_clue((select v::uuid from ctx where k = 'fround'), 'clue');
select tests.as_user(tests.u(10));
select lock_dial((select v::uuid from ctx where k = 'fround'), 20);
select throws_ok($$ select lock_dial((select v::uuid from ctx where k = 'fround'), 25) $$, 'already locked', 'free-mode re-lock raises');
select tests.as_user(tests.u(11));
select lock_dial((select v::uuid from ctx where k = 'fround'), 80);
reset role;
select is((select phase from rounds where id = (select v::uuid from ctx where k = 'fround')), 'reveal', '6. free play auto-reveals once every guesser locked');
select is((select score from seats where room_id = (select id from rooms where code = (select v from ctx where k = 'fcode')) and position = 0),
  (select round(avg(band_points((select target from round_secrets where round_id = (select v::uuid from ctx where k = 'fround')), dial)))::int
     from guesses where round_id = (select v::uuid from ctx where k = 'fround')),
  '6. the psychic scored the rounded average of guesser points');

-- 8. rematch ---------------------------------------------------------------------
-- fresh 2-team room to 3 points; fix the target at 50 so dial 50 (4 pts) wins outright
select tests.as_user(tests.u(1));
insert into ctx select 'rcode', create_room('teams', 3, 2, null);
select tests.as_user(tests.u(2));
select join_room((select v from ctx where k = 'rcode'), 'Red', '#e11', array['Sam']);
select tests.as_user(tests.u(3));
select join_room((select v from ctx where k = 'rcode'), 'Blue', '#11e', array['Kim']);
select tests.as_user(tests.u(1));
select start_game((select id from rooms where code = (select v from ctx where k = 'rcode')));
reset role;
insert into ctx select 'rroom', id::text from rooms where code = (select v from ctx where k = 'rcode');
insert into ctx select 'rround', id::text from rounds where room_id = (select v::uuid from ctx where k = 'rroom');
select tests.as_user(tests.u(1));
select throws_ok($$ select rematch((select v::uuid from ctx where k = 'rroom')) $$, 'rematch only after the game ends', 'rematch is refused mid-game');
select tests.as_user(tests.u(2));
select pick_card((select v::uuid from ctx where k = 'rround'), (select card_options[1] from rounds where id = (select v::uuid from ctx where k = 'rround')));
reset role;
update round_secrets set target = 50 where round_id = (select v::uuid from ctx where k = 'rround');
select tests.as_user(tests.u(2));
select finish_spin((select v::uuid from ctx where k = 'rround'));
select submit_clue((select v::uuid from ctx where k = 'rround'), 'c');
select lock_dial((select v::uuid from ctx where k = 'rround'), 50);
select tests.as_user(tests.u(3));
select lock_lr((select v::uuid from ctx where k = 'rround'), 'left');
reset role;
select is((select status from rooms where id = (select v::uuid from ctx where k = 'rroom')), 'finished', 'precondition: the game finished');
select tests.as_user(tests.u(1));
select rematch((select v::uuid from ctx where k = 'rroom'));
select is((select sum(score)::int from seats where room_id = (select v::uuid from ctx where k = 'rroom')), 0, '8. rematch zeroes every score');
select is((select array_agg(number order by number) from rounds where room_id = (select v::uuid from ctx where k = 'rroom')), array[1], '8. rematch creates round 1 (only)');

reset role;
select * from finish();
rollback;
