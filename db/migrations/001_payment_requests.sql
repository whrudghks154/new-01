create extension if not exists pgcrypto;

create table if not exists payment_requests (
  id uuid primary key default gen_random_uuid(),
  public_token text unique not null,
  company_name text not null,
  item_name text not null,
  goods_name text not null,
  amount integer not null check (amount > 0),
  vat_included boolean not null default true,
  memo text,
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'paid', 'closed', 'expired', 'cancelled', 'recovery_required')
  ),
  expires_at timestamptz,
  processing_expires_at timestamptz,
  paid_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references payment_requests(id),
  order_id text unique not null,
  tid text,
  amount integer not null,
  status text not null default 'created' check (
    status in ('created', 'authenticated', 'approved', 'failed', 'cancelled', 'recovery_required')
  ),
  auth_result_code text,
  result_code text,
  result_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_login_attempts (
  access_key text primary key,
  failed_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_requests_public_token_uidx
  on payment_requests (public_token);

create unique index if not exists payment_attempts_order_id_uidx
  on payment_attempts (order_id);

create index if not exists payment_requests_status_idx
  on payment_requests (status);

create index if not exists payment_requests_expires_at_idx
  on payment_requests (expires_at);

create index if not exists payment_requests_status_expires_at_idx
  on payment_requests (status, expires_at);

create index if not exists payment_attempts_payment_request_id_idx
  on payment_attempts (payment_request_id);

create index if not exists admin_login_attempts_locked_until_idx
  on admin_login_attempts (locked_until);

create or replace function set_payment_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists payment_requests_updated_at on payment_requests;
create trigger payment_requests_updated_at
before update on payment_requests
for each row execute function set_payment_updated_at();

drop trigger if exists payment_attempts_updated_at on payment_attempts;
create trigger payment_attempts_updated_at
before update on payment_attempts
for each row execute function set_payment_updated_at();

drop trigger if exists admin_login_attempts_updated_at on admin_login_attempts;
create trigger admin_login_attempts_updated_at
before update on admin_login_attempts
for each row execute function set_payment_updated_at();
