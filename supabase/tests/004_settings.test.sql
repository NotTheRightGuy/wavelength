begin;
select plan(7);

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

insert into auth.users (id, aud, role) select tests.u(n), 'authenticated', 'authenticated' from generate_series(1, 3) n;

create temp table ctx (k text primary key, v text);
grant all on ctx to authenticated, anon;

select tests.as_user(tests.u(1));
insert into ctx select 'code', create_room('teams', 10, 2, null);
reset role;
insert into ctx select 'room', id::text from rooms where code = (select v from ctx where k = 'code');

select tests.as_user(tests.u(1));
select update_room_settings((select v::uuid from ctx where k = 'room'), 15, 3, 90);
reset role;
select is((select winning_score from rooms where id = (select v::uuid from ctx where k = 'room')), 15, 'host updates winning score');
select is((select laps || '/' || timer_secs from rooms where id = (select v::uuid from ctx where k = 'room')), '3/90', 'host updates laps and timer');

select tests.as_user(tests.u(2));
select throws_ok($$ select update_room_settings((select v::uuid from ctx where k = 'room'), 12, 2, 60) $$, 'host only', 'non-host cannot update settings');

select tests.as_user(tests.u(1));
select throws_ok($$ select update_room_settings((select v::uuid from ctx where k = 'room'), 4, 2, 60) $$, 'winning score must be 5 to 20', 'winning score below range raises');
select throws_ok($$ select update_room_settings((select v::uuid from ctx where k = 'room'), 10, 6, 60) $$, 'laps must be 1 to 5', 'laps above range raises');

select tests.as_user(tests.u(2));
select join_room((select v from ctx where k = 'code'), 'A', '#111', array['a']);
select tests.as_user(tests.u(3));
select join_room((select v from ctx where k = 'code'), 'B', '#222', array['b']);
select tests.as_user(tests.u(1));
select start_game((select v::uuid from ctx where k = 'room'));
select throws_ok($$ select update_room_settings((select v::uuid from ctx where k = 'room'), 10, 2, 60) $$, 'cannot change settings after start', 'settings locked after start');
reset role;
select is((select winning_score from rooms where id = (select v::uuid from ctx where k = 'room')), 15, 'values unchanged after rejected update');

select * from finish();
rollback;
