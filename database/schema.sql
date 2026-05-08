-- swim-tracker database schema
-- André | 22 anos | 196cm | 93kg | objetivo: 13.90s → 12.00s nos 50m freestyle

create table if not exists swim_times (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time_seconds numeric(6,2) not null,
  location text,
  created_at timestamptz default now()
);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  day_type text not null, -- 'A', 'B', 'C', 'D', etc.
  difficulty integer check (difficulty between 1 and 10),
  created_at timestamptz default now()
);

create table if not exists set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references workout_sessions(id) on delete cascade,
  exercise_id text not null,
  set_number integer not null,
  status text not null check (status in ('done', 'skipped', 'failed')),
  created_at timestamptz default now()
);

create table if not exists progressions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  exercise text not null,
  load_kg numeric(5,2) not null,
  created_at timestamptz default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text not null check (type in ('geral', 'tecnica', 'nutricao', 'recuperacao')),
  content text not null,
  created_at timestamptz default now()
);

-- indexes for common queries
create index if not exists swim_times_date_idx on swim_times(date desc);
create index if not exists workout_sessions_date_idx on workout_sessions(date desc);
create index if not exists set_logs_session_idx on set_logs(session_id);
create index if not exists progressions_exercise_idx on progressions(exercise, date desc);
create index if not exists notes_date_idx on notes(date desc);
