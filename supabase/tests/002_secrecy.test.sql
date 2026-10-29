begin;
select plan(33);

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

insert into auth.users (id, aud, role) select tests.u(n), 'authenticated', 'authenticated' from generate_series(1, 6) n;

create temp table ctx (k text primary key, v text);
grant all on ctx to authenticated, anon;

-- ---------------------------------------------------------------- team room
-- 1 = Red (A), 2 = Blue (B), 3 = host, not seated
select tests.as_user(tests.u(3));
insert into ctx select 'code', create_room('teams', 10, 2, null);
select tests.as_user(tests.u(1));
select join_room((select v from ctx where k = 'code'), 'Red', '#e11', array['Sam', 'Ana']);
select tests.as_user(tests.u(2));
select join_room((select v from ctx where k = 'code'), 'Blue', '#11e', array['Kim']);
select tests.as_user(tests.u(3));
select start_game((select id from rooms where code = (select v from ctx where k = 'code')));
reset role;
insert into ctx select 'round', id::text from rounds where room_id = (select id from rooms where code = (select v from ctx where k = 'code'));

-- before the pick there is no secret at all
select tests.as_user(tests.u(1));
select is((select count(*)::int from round_secrets), 0, 'no secret exists before the card pick');
select pick_card((select v::uuid from ctx where k = 'round'),
  (select card_options[1] from rounds where id = (select v::uuid from ctx where k = 'round')));

select is((select count(*)::int from round_secrets), 1, 'active seat can read the target');
reset role;
insert into ctx select 'target', target::text from round_secrets;
select tests.as_user(tests.u(1));
select is(get_target((select v::uuid from ctx where k = 'round')), (select v::numeric from ctx where k = 'target'),
  'get_target returns the value to the active seat');

select tests.as_user(tests.u(2));
select is((select count(*)::int from round_secrets), 0, 'other team cannot read the target');
select is(get_target((select v::uuid from ctx where k = 'round')), null::numeric, 'get_target is null for the other team');

select tests.as_user(tests.u(3));
select is((select count(*)::int from round_secrets), 0, 'host/screen cannot read the target before reveal');
select is(get_target((select v::uuid from ctx where k = 'round')), null::numeric, 'get_target is null for the host before reveal');
select throws_ok($$ select pick_card((select v::uuid from ctx where k = 'round'), 1) $$, 'not your turn', 'host cannot act as the psychic');

-- the number is not anywhere else a client can read
select is((select result from rounds where id = (select v::uuid from ctx where k = 'round')), null::jsonb,
  'rounds.result is null before reveal');
select is(
  (select position((select v from ctx where k = 'target') in (to_jsonb(r)::text || (select to_jsonb(rm)::text from rooms rm where rm.id = r.room_id))) from rounds r where r.id = (select v::uuid from ctx where k = 'round')),
  0, 'neither the round row nor rooms.game contain the target before reveal');
select is(
  position((select v from ctx where k = 'target') in (get_room_state((select v from ctx where k = 'code')))::text),
  0, 'get_room_state (host) does not leak the target');
select tests.as_user(tests.u(2));
select is(
  position((select v from ctx where k = 'target') in (get_room_state((select v from ctx where k = 'code')))::text),
  0, 'get_room_state (other team) does not leak the target');

-- a stranger holding the code sees no round data
select tests.as_user(tests.u(4));
select is(get_room_state((select v from ctx where k = 'code'))->'round', 'null'::jsonb, 'non-member: round is null');
select is(get_room_state((select v from ctx where k = 'code'))->'guesses', '[]'::jsonb, 'non-member: guesses are empty');
select is((select count(*)::int from round_secrets), 0, 'non-member cannot read secrets');

-- play to the reveal
select tests.as_user(tests.u(1));
select finish_spin((select v::uuid from ctx where k = 'round'));
select submit_clue((select v::uuid from ctx where k = 'round'), 'clue');
select is((select count(*)::int from round_secrets), 1, 'active seat still reads the target in the dial phase');
select lock_dial((select v::uuid from ctx where k = 'round'), 50);
select tests.as_user(tests.u(2));
select is((select count(*)::int from round_secrets), 0, 'other team still cannot read it in the lr phase');
select lock_lr((select v::uuid from ctx where k = 'round'), 'left');

select is((select count(*)::int from round_secrets), 1, 'other team reads the target after the reveal');
select tests.as_user(tests.u(3));
select is((select count(*)::int from round_secrets), 1, 'host reads the target after the reveal');
select is((select (result->>'target')::numeric from rounds where id = (select v::uuid from ctx where k = 'round')),
  (select v::numeric from ctx where k = 'target'), 'rounds.result carries the same target after the reveal');

-- ---------------------------------------------------------------- free play
-- 1,2,3 = players (1 is the first psychic), 5 = host, not seated
select tests.as_user(tests.u(5));
insert into ctx select 'fcode', create_room('free', 10, 1, null);
select tests.as_user(tests.u(1));
select join_room((select v from ctx where k = 'fcode'), 'P1', '#111', null);
select tests.as_user(tests.u(2));
select join_room((select v from ctx where k = 'fcode'), 'P2', '#222', null);
select tests.as_user(tests.u(3));
select join_room((select v from ctx where k = 'fcode'), 'P3', '#333', null);
select tests.as_user(tests.u(5));
select start_game((select id from rooms where code = (select v from ctx where k = 'fcode')));
reset role;
insert into ctx select 'fround', id::text from rounds where room_id = (select id from rooms where code = (select v from ctx where k = 'fcode'));
select tests.as_user(tests.u(1));
select pick_card((select v::uuid from ctx where k = 'fround'),
  (select card_options[1] from rounds where id = (select v::uuid from ctx where k = 'fround')));
select finish_spin((select v::uuid from ctx where k = 'fround'));
select submit_clue((select v::uuid from ctx where k = 'fround'), 'clue');
select tests.as_user(tests.u(2));
select is(get_target((select v::uuid from ctx where k = 'fround')), null::numeric, 'free play: a guesser cannot read the target');
select lock_dial((select v::uuid from ctx where k = 'fround'), 30);
select is((select count(*)::int from guesses where round_id = (select v::uuid from ctx where k = 'fround')), 1, 'free play: a player sees their own dial');
select tests.as_user(tests.u(3));
select is((select count(*)::int from guesses where round_id = (select v::uuid from ctx where k = 'fround')), 0, 'free play: other players dials are invisible before the reveal');
select tests.as_user(tests.u(1));
select is((select count(*)::int from guesses where round_id = (select v::uuid from ctx where k = 'fround')), 0, 'free play: the psychic cannot see dials before the reveal');
select tests.as_user(tests.u(5));
select is((select count(*)::int from guesses where round_id = (select v::uuid from ctx where k = 'fround')), 0, 'free play: the host cannot see dials before the reveal');
select tests.as_user(tests.u(3));
select lock_dial((select v::uuid from ctx where k = 'fround'), 70);
select is((select count(*)::int from guesses where round_id = (select v::uuid from ctx where k = 'fround')), 2, 'free play: all dials are visible after the reveal (player)');
select tests.as_user(tests.u(5));
select is((select count(*)::int from guesses where round_id = (select v::uuid from ctx where k = 'fround')), 2, 'free play: all dials are visible after the reveal (host)');

-- ---------------------------------------------------------------- anon / writes
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok($$ select create_room('teams', 10, 2, null) $$, 'permission denied for function create_room', 'anon cannot call create_room');
select throws_ok($$ select get_target('00000000-0000-0000-0000-000000000001') $$, 'permission denied for function get_target', 'anon cannot call get_target');
select throws_ok($$ select get_room_state('ABCD') $$, 'permission denied for function get_room_state', 'anon cannot call get_room_state');

select tests.as_user(tests.u(1));
select throws_ok($$ update seats set score = 99 $$, 'permission denied for table seats', 'clients cannot write tables directly');
select throws_ok($$ insert into round_secrets (round_id, target) values (gen_random_uuid(), 50) $$, 'permission denied for table round_secrets', 'clients cannot insert secrets');
select throws_ok($$ select _reveal_round(gen_random_uuid()) $$, 'permission denied for function _reveal_round', 'internal _reveal_round is not callable by clients');

reset role;
select * from finish();
rollback;
