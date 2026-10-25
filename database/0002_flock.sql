-- Fresh Eggs Daily flock domain. Mirrors src/contracts/domain.ts (CollectionMap).
-- Every table is household-scoped with an FK to households; authorization must
-- still check household_members (see 0001_identity.sql). Dates without a time
-- are local calendar days (date); instants are timestamptz.

create table if not exists flocks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  coop_name text,
  notes text,
  feed_times text[] check (feed_times is null or array_length(feed_times, 1) between 1 and 3),
  feed_item_id uuid, -- feed_inventory row feedings draw from; null means the first feed item
  track_feed_amounts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists flocks_household_idx on flocks(household_id);

-- Coops are optional containers for flocks; phase 1 stores a coop name on the flock.
create table if not exists coops (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists birds (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  flock_id uuid not null references flocks(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  breed text,
  hatch_date date,
  color text,
  photo_path text, -- object storage key; the local build keeps a compressed data URL instead
  status text not null default 'active' check (status in ('active','rehomed','deceased')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists birds_household_flock_idx on birds(household_id, flock_id);

create table if not exists bird_health_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  flock_id uuid not null references flocks(id) on delete cascade,
  bird_id uuid references birds(id) on delete cascade, -- null = whole flock
  type text not null check (type in ('deworming','mites_lice_check','injury','molt','vaccination','vet_visit','quarantine','other')),
  occurred_on date not null,
  ends_on date,
  remind_on date,
  reminder_done boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= occurred_on)
);
create index if not exists health_household_remind_idx on bird_health_events(household_id, remind_on) where not reminder_done;

create table if not exists egg_collections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  flock_id uuid not null references flocks(id) on delete cascade,
  bird_id uuid references birds(id) on delete set null,
  collected_on date not null,
  count integer not null check (count > 0),
  damaged integer not null default 0 check (damaged >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (damaged <= count)
);
create index if not exists eggs_household_day_idx on egg_collections(household_id, collected_on);

-- Eggs leaving stock: sold, given away or used at home.
create table if not exists egg_inventory (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  occurred_on date not null,
  kind text not null check (kind in ('sold','given','used')),
  count integer not null check (count > 0),
  amount numeric(10,2) check (amount is null or amount >= 0),
  customer text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists egg_inventory_household_day_idx on egg_inventory(household_id, occurred_on);

create table if not exists flock_costs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  occurred_on date not null,
  category text not null check (category in ('feed','bedding','vet','equipment','other')),
  amount numeric(10,2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists flock_costs_household_day_idx on flock_costs(household_id, occurred_on);

create table if not exists chore_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  recurrence text not null check (recurrence in ('daily','weekly','monthly','seasonal')),
  start_date date not null,
  active boolean not null default true,
  built_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chore_occurrences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  template_id uuid not null references chore_templates(id) on delete cascade,
  title text not null,
  due_on date not null,
  completed_at timestamptz,
  assigned_to uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, due_on)
);

create table if not exists feed_inventory (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  category text not null check (category in ('feed','treats','scratch','bedding','supplement','grit','coop_care','other')),
  unit text not null,
  quantity numeric(12,3) not null check (quantity >= 0),
  counted_on date not null,
  daily_usage numeric(12,3) not null default 0 check (daily_usage >= 0),
  low_stock_days integer not null default 7 check (low_stock_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feed_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  item_id uuid not null references feed_inventory(id) on delete cascade,
  occurred_on date not null,
  kind text not null check (kind in ('restock','recount','use')),
  amount numeric(12,3) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Names-only people in the household (no login), used for "done by" on feedings.
create table if not exists household_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null check (length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Daily feeding check-off. One row per flock, day and feed time slot.
create table if not exists feeding_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  flock_id uuid not null references flocks(id) on delete cascade,
  day date not null,
  slot smallint not null check (slot between 0 and 2),
  label text not null,
  done_at timestamptz not null,
  done_by text,
  item_id uuid references feed_inventory(id) on delete set null,
  amount numeric(12,3) check (amount is null or amount >= 0),
  feed_log_id uuid references feed_logs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (flock_id, day, slot)
);

create table if not exists treat_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  flock_id uuid not null references flocks(id) on delete cascade,
  day date not null,
  item_id uuid not null references feed_inventory(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  unit text not null check (unit in ('cups','grams','handfuls')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists incubation_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  set_on date not null,
  egg_count integer not null check (egg_count > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hatch_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  batch_id uuid not null unique references incubation_batches(id) on delete cascade,
  recorded_on date not null,
  hatched integer not null check (hatched >= 0),
  unhatched integer not null check (unhatched >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Content and commerce placeholders (not used by the local build yet).
create table if not exists articles (slug text primary key, title text not null, topic text not null, body jsonb not null, published_at timestamptz);
create table if not exists recipes (slug text primary key, title text not null, body jsonb not null, published_at timestamptz);
create table if not exists products (id uuid primary key default gen_random_uuid(), external_ref text unique, title text not null, category text, url text);
create table if not exists orders (id uuid primary key default gen_random_uuid(), household_id uuid not null references households(id), external_ref text, status text not null, created_at timestamptz not null default now());
create table if not exists subscriptions (id uuid primary key default gen_random_uuid(), household_id uuid not null references households(id), external_ref text, status text not null, created_at timestamptz not null default now());
