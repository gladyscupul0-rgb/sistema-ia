-- ============================================================
-- Sistema de administracion - Schema para Supabase
-- Ejecutar este script en: Supabase Dashboard -> SQL Editor
-- ============================================================

-- Extensión para IDs
create extension if not exists "pgcrypto";

-- ---------- Usuarios (auth propio del backend) ----------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,          -- bcrypt, nunca texto plano
  created_at timestamptz not null default now()
);

-- ---------- Clientes ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

-- ---------- Pedidos (agenda de ventas) ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null default 0,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'en_proceso', 'entregado', 'cancelado')),
  order_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------- Cargas / gastos (para el balance) ----------
create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  amount numeric(12,2) not null default 0,
  charge_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------- Geocercas (modulo Mapas) ----------
-- Polygon guardado como arreglo de pares [lat, lng].
create table if not exists public.geofences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#38bdf8',
  points jsonb not null,                 -- [[lat,lng], [lat,lng], ...]
  created_at timestamptz not null default now()
);

-- ---------- Dispositivos moviles (modulo Mapas) ----------
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  device_key text unique not null default encode(gen_random_bytes(16), 'hex'),
  last_lat double precision,
  last_lng double precision,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Indices ----------
create index if not exists orders_client_id_idx on public.orders(client_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_order_date_idx on public.orders(order_date);
create index if not exists charges_charge_date_idx on public.charges(charge_date);

-- ---------- Row Level Security ----------
-- El backend usa la service role key, que ignora RLS.
-- Aun asi activamos RLS para que nadie acceda directo desde el frontend
-- con la anon key. Si en el futuro expones tablas al cliente, crea
-- politicas explicitas.
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.charges enable row level security;
alter table public.geofences enable row level security;
alter table public.devices enable row level security;

-- Sin politicas = solo la service role (backend) puede leer/escribir.
