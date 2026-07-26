create table if not exists public.bankidzz_locations (
    id bigint generated always as identity primary key,
    transfer_id text not null unique,
    sender text not null default '',
    receiver text not null default '',
    amount text not null default '',
    total text not null default '',
    latitude double precision not null check (latitude between -90 and 90),
    longitude double precision not null check (longitude between -180 and 180),
    accuracy double precision not null check (accuracy >= 0),
    captured_at timestamptz not null,
    status text not null default 'verified',
    verification_code text not null default '',
    consented_at timestamptz not null default now()
);

alter table public.bankidzz_locations enable row level security;

-- Tidak ada policy publik. Semua baca/tulis dilakukan oleh Vercel Function
-- memakai SUPABASE_SERVICE_ROLE_KEY yang hanya tersimpan di server.

create index if not exists bankidzz_locations_consented_at_idx
    on public.bankidzz_locations (consented_at desc);
