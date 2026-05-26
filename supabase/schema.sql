create table if not exists clinic_states (
  clinic_id text primary key check (clinic_id in ('ortho', 'surgery', 'medicine', 'urology', 'anaesthesia')),
  clinic_name text not null,
  clinic_subtitle text not null,
  clinic_prefix text not null,
  doctor_message text not null,
  next_token_number integer not null default 1,
  next_queue_order integer not null default 1,
  emergency_closed boolean not null default false,
  emergency_message text not null default '',
  last_updated timestamptz not null default timezone('utc', now()),
  last_synced_at timestamptz not null default timezone('utc', now())
);

create table if not exists queue_entries (
  id text primary key,
  clinic_id text not null references clinic_states(clinic_id) on delete cascade,
  client_request_id text not null unique,
  queue_order integer not null,
  token text not null,
  booking_id text not null,
  name text not null,
  mobile text not null default '',
  source text not null check (source in ('booking', 'walk-in')),
  day_label text not null,
  slot_label text not null,
  status text not null check (status in ('waiting', 'in-progress', 'hold', 'done', 'skipped')),
  sync_state text not null default 'synced' check (sync_state in ('synced', 'pending')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  notes text,
  requires_pharmacy_follow_up boolean not null default false,
  pharmacy_status text not null default 'not-needed'
    check (pharmacy_status in ('not-needed', 'pending', 'done'))
);

create index if not exists queue_entries_clinic_queue_order_idx
  on queue_entries (clinic_id, queue_order);
create index if not exists queue_entries_clinic_status_idx
  on queue_entries (clinic_id, status, queue_order);

create table if not exists staff_members (
  id text primary key,
  name text not null,
  role text not null check (role in ('doctor', 'staff', 'pharmacist')),
  pin_hash text not null,
  phone text not null default '',
  email text not null default '',
  designation text not null default '',
  clinic_access text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'hold', 'removed')),
  joined_at timestamptz not null,
  last_login_at timestamptz,
  created_by text not null default 'doctor'
);

create index if not exists staff_members_status_joined_idx
  on staff_members (status, joined_at desc);

create table if not exists patient_visits (
  id text primary key,
  mobile text not null,
  name text not null,
  clinic_id text not null check (clinic_id in ('ortho', 'surgery', 'medicine', 'urology', 'anaesthesia')),
  token text not null,
  booking_id text not null,
  source text not null check (source in ('booking', 'walk-in')),
  day_label text not null,
  slot_label text not null,
  status text not null,
  visit_date date not null,
  created_at timestamptz not null
);

create index if not exists patient_visits_mobile_created_idx
  on patient_visits (mobile, created_at desc);

create table if not exists default_schedules (
  clinic_id text primary key check (clinic_id in ('ortho', 'surgery', 'medicine', 'urology', 'anaesthesia')),
  shifts jsonb not null,
  weekly_off text[] not null default '{}',
  slot_interval integer not null default 30,
  max_patients integer not null default 20,
  updated_at timestamptz not null,
  updated_by text not null
);

create table if not exists day_overrides (
  id text primary key,
  clinic_id text not null check (clinic_id in ('ortho', 'surgery', 'medicine', 'urology', 'anaesthesia')),
  override_date date not null,
  closed_shifts integer[] not null default '{}',
  full_day_closed boolean not null default false,
  reason text not null default '',
  created_by text not null,
  created_at timestamptz not null,
  unique (clinic_id, override_date)
);

create index if not exists day_overrides_clinic_date_idx
  on day_overrides (clinic_id, override_date desc);

create table if not exists week_schedules (
  id text primary key,
  clinic_id text not null check (clinic_id in ('ortho', 'surgery', 'medicine', 'urology', 'anaesthesia')),
  week_start date not null,
  week_end date not null,
  days jsonb not null,
  updated_at timestamptz not null,
  updated_by text not null,
  unique (clinic_id, week_start)
);

create index if not exists week_schedules_clinic_week_idx
  on week_schedules (clinic_id, week_start desc);

create table if not exists prescriptions (
  id text primary key,
  clinic_id text not null check (clinic_id in ('ortho', 'surgery', 'medicine', 'urology', 'anaesthesia')),
  token_id text not null,
  patient_name text not null,
  date date not null,
  photo_paths text[] not null default '{}',
  status text not null default 'sent' check (status in ('sent', 'preparing', 'ready')),
  created_by text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists prescriptions_date_created_idx
  on prescriptions (date desc, created_at desc);
create index if not exists prescriptions_clinic_date_idx
  on prescriptions (clinic_id, date desc, created_at desc);
