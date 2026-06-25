create table if not exists public.vessel_tracking (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  vessel_name text,
  voyage_number text,
  imo text,
  mmsi text,
  latitude numeric(10, 6),
  longitude numeric(10, 6),
  speed_knots numeric(8, 2),
  course_degrees numeric(8, 2),
  heading_degrees numeric(8, 2),
  navigational_status text,
  destination text,
  ais_timestamp timestamptz,
  provider text not null default 'aisstream',
  raw_payload jsonb not null default '{}'::jsonb,
  last_refresh_attempt_at timestamptz,
  last_refresh_status text not null default 'not_configured',
  last_refresh_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, shipment_id)
);

create index if not exists vessel_tracking_company_id_idx on public.vessel_tracking(company_id);
create index if not exists vessel_tracking_shipment_id_idx on public.vessel_tracking(shipment_id);
create index if not exists vessel_tracking_mmsi_idx on public.vessel_tracking(mmsi);

drop trigger if exists set_vessel_tracking_updated_at on public.vessel_tracking;
create trigger set_vessel_tracking_updated_at
before update on public.vessel_tracking
for each row execute function public.set_updated_at();

alter table public.vessel_tracking enable row level security;

drop policy if exists "Members can read company vessel tracking" on public.vessel_tracking;
create policy "Members can read company vessel tracking"
on public.vessel_tracking for select
to authenticated
using (company_id = public.current_company_id());

drop policy if exists "Admins and shippers can manage vessel tracking" on public.vessel_tracking;
create policy "Admins and shippers can manage vessel tracking"
on public.vessel_tracking for all
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'))
with check (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'));
