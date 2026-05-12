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

create table if not exists swim_metrics (
  id                      uuid primary key default gen_random_uuid(),
  date                    date not null,
  -- saída de blocos
  dolphin_kicks_start     smallint,      -- dolphin kicks após saída de blocos
  underwater_dist_m       numeric(4,1),  -- distância subaquática após saída (m)
  reaction_time_s         numeric(4,3),  -- tempo de reação (s)
  -- empurrão da parede (sem salto)
  dolphin_kicks_wall      smallint,      -- dolphin kicks após empurrão da parede
  underwater_dist_wall_m  numeric(4,1),  -- distância subaquática após empurrão (m)
  stroke_count_wall       smallint,      -- braçadas após empurrão da parede
  -- métricas gerais
  stroke_count_25m        smallint,      -- total de braçadas nos 25m
  stroke_rate_cpm         numeric(4,1),  -- cadência (ciclos/min)
  notes                   text,
  created_at              timestamptz default now()
);

-- indexes for common queries
create index if not exists swim_times_date_idx on swim_times(date desc);
create index if not exists workout_sessions_date_idx on workout_sessions(date desc);
create index if not exists set_logs_session_idx on set_logs(session_id);
create index if not exists progressions_exercise_idx on progressions(exercise, date desc);
create index if not exists notes_date_idx       on notes(date desc);
create index if not exists swim_metrics_date_idx on swim_metrics(date desc);

create table if not exists weight_logs (
  id        uuid primary key default gen_random_uuid(),
  date      date not null,
  weight_kg numeric(5,1) not null,
  created_at timestamptz default now()
);
create index if not exists weight_logs_date_idx on weight_logs(date desc);
