create extension if not exists pgcrypto;

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text not null,
  access_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  grade text not null,
  school text not null,
  default_dismissal text not null,
  created_at timestamptz not null default now()
);

create table if not exists schedule_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  title text not null,
  type text not null,
  start_time text not null,
  end_time text not null,
  location text not null,
  pickup_owner text not null,
  notes text not null default '',
  packing_list text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists children_household_id_idx on children (household_id);
create index if not exists schedule_items_household_id_idx on schedule_items (household_id);
create index if not exists schedule_items_child_id_idx on schedule_items (child_id);
