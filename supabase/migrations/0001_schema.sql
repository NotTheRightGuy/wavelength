create extension if not exists pgcrypto;

create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_session uuid not null,
  mode text not null check (mode in ('teams', 'free')),
  winning_score int not null default 10 check (winning_score between 3 and 30),
  laps int not null default 2 check (laps between 1 and 5),
  timer_secs int check (timer_secs in (60, 90, 120)),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  game jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_active timestamptz not null default now()
);

create table seats (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms on delete cascade,
  session_id uuid not null,
  position int not null,
  name text not null check (char_length(name) between 1 and 24),
  color text not null,
  members text[] not null default '{}',
  turns_taken int not null default 0,
  score int not null default 0,
  unique (room_id, position),
  unique (room_id, session_id)
);

create table viewers (
  room_id uuid not null references rooms on delete cascade,
  session_id uuid not null,
  primary key (room_id, session_id)
);

create table cards (
  id serial primary key,
  room_id uuid references rooms on delete cascade, -- null = built-in
  left_label text not null,
  right_label text not null
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms on delete cascade,
  number int not null,
  seat_id uuid not null references seats,
  psychic_name text not null,
  phase text not null default 'card_pick'
    check (phase in ('card_pick', 'spin', 'clue', 'dial', 'lr', 'reveal')),
  card_options int[] not null,
  card_id int references cards,
  clue text,
  dial_deadline timestamptz,
  result jsonb,
  created_at timestamptz not null default now(),
  unique (room_id, number)
);

create table round_secrets (
  round_id uuid primary key references rounds on delete cascade,
  target numeric not null check (target between 10 and 90)
);

create table guesses (
  round_id uuid not null references rounds on delete cascade,
  seat_id uuid not null references seats on delete cascade,
  dial numeric check (dial between 0 and 100),
  lr text check (lr in ('left', 'right')),
  primary key (round_id, seat_id)
);

-- Membership ---------------------------------------------------------------
create function is_room_member(p_room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rooms where id = p_room and host_session = auth.uid())
      or exists (select 1 from seats where room_id = p_room and session_id = auth.uid())
      or exists (select 1 from viewers where room_id = p_room and session_id = auth.uid());
$$;

-- RLS: reads only, no write policies at all -----------------------------------
alter table rooms enable row level security;
alter table seats enable row level security;
alter table viewers enable row level security;
alter table cards enable row level security;
alter table rounds enable row level security;
alter table round_secrets enable row level security;
alter table guesses enable row level security;

create policy rooms_read on rooms for select using (is_room_member(id));
create policy seats_read on seats for select using (is_room_member(room_id));
create policy cards_read on cards for select using (room_id is null or is_room_member(room_id));
create policy rounds_read on rounds for select using (is_room_member(room_id));

-- The secret target: active seat before reveal, any member after.
create policy secrets_read on round_secrets for select using (
  exists (
    select 1 from rounds r
    where r.id = round_secrets.round_id
      and is_room_member(r.room_id)
      and (
        r.phase = 'reveal'
        or (r.phase in ('spin', 'clue', 'dial')
            and exists (select 1 from seats s where s.id = r.seat_id and s.session_id = auth.uid()))
      )
  )
);

-- Free-play dials stay private until the reveal; team dials are public.
create policy guesses_read on guesses for select using (
  exists (
    select 1 from rounds r join rooms m on m.id = r.room_id
    where r.id = guesses.round_id
      and is_room_member(r.room_id)
      and (
        m.mode = 'teams'
        or r.phase = 'reveal'
        or exists (select 1 from seats s where s.id = guesses.seat_id and s.session_id = auth.uid())
      )
  )
);

-- Realtime --------------------------------------------------------------------
alter publication supabase_realtime add table rooms, seats, rounds, guesses;
