create extension if not exists "pgcrypto";

create type public.user_role as enum (
  'admin',
  'shipper',
  'shipping_line_guest'
);

create type public.shipment_status as enum (
  'draft',
  'docs_pending',
  'docs_review',
  'shared_with_line',
  'booking_requested',
  'booking_confirmed',
  'in_transit',
  'arrived',
  'delivered',
  'closed',
  'delayed'
);

create type public.document_status as enum (
  'not_uploaded',
  'uploaded',
  'processing',
  'needs_review',
  'approved',
  'rejected',
  'shared_with_line',
  'accepted_by_line'
);

create type public.document_type as enum (
  'commercial_invoice',
  'packing_list',
  'certificate_of_origin',
  'msds',
  'dg_declaration',
  'export_permit',
  'import_permit',
  'insurance_certificate',
  'booking_confirmation',
  'shipping_instructions',
  'draft_bl',
  'final_bl_sea_waybill',
  'vgm_declaration',
  'other'
);

create type public.milestone_status as enum (
  'pending',
  'in_progress',
  'completed',
  'blocked',
  'skipped'
);

create type public.event_source as enum (
  'manual',
  'system',
  'shipping_line_guest'
);

create type public.feedback_priority as enum (
  'low',
  'medium',
  'high'
);

create type public.feedback_status as enum (
  'open',
  'reviewed',
  'resolved'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.user_role not null default 'shipper',
  title text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, email)
);

create or replace function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shipment_reference text not null,
  shipper_name text not null,
  consignee_name text not null,
  notify_party text,
  cargo_description text not null,
  item_type text,
  hs_code text,
  package_count integer,
  dimensions text,
  gross_weight_kg numeric(12, 3),
  net_weight_kg numeric(12, 3),
  volume_cbm numeric(12, 3),
  incoterm text,
  origin text not null,
  destination text not null,
  pol text,
  pod text,
  container_type text,
  preferred_etd date,
  preferred_eta date,
  carrier text,
  booking_number text,
  bl_number text,
  container_number text,
  status public.shipment_status not null default 'draft',
  document_status public.document_status not null default 'not_uploaded',
  bl_status text not null default 'Not issued',
  next_action text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, shipment_reference)
);

create table public.cargo_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  description text not null,
  item_type text,
  hs_code text,
  package_count integer,
  length_cm numeric(12, 3),
  width_cm numeric(12, 3),
  height_cm numeric(12, 3),
  gross_weight_kg numeric(12, 3),
  net_weight_kg numeric(12, 3),
  volume_cbm numeric(12, 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipment_parties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  party_type text not null,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  document_type public.document_type not null,
  file_name text not null,
  storage_path text,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_by_name text,
  uploaded_at timestamptz,
  status public.document_status not null default 'not_uploaded',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  milestone text not null,
  status public.milestone_status not null default 'pending',
  event_timestamp timestamptz,
  responsible_party text,
  notes text,
  source public.event_source not null default 'manual',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shipment_id uuid references public.shipments(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text not null,
  user_role public.user_role not null,
  message text not null,
  attachment_storage_path text,
  created_at timestamptz not null default now()
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  token_hash text not null unique,
  recipient_company text,
  recipient_name text,
  recipient_email text,
  can_comment boolean not null default true,
  can_upload_documents boolean not null default true,
  can_update_status boolean not null default true,
  expires_at timestamptz not null,
  last_viewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.bill_of_lading_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  bl_number text,
  bl_type text,
  status text not null default 'Not issued',
  draft_document_id uuid references public.documents(id) on delete set null,
  final_document_id uuid references public.documents(id) on delete set null,
  issued_at timestamptz,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_by_name text,
  page_or_feature text not null,
  comment text not null,
  priority public.feedback_priority not null default 'medium',
  status public.feedback_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shipment_id uuid references public.shipments(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  actor_role public.user_role,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  shipment_id uuid references public.shipments(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index profiles_company_id_idx on public.profiles(company_id);
create index shipments_company_id_idx on public.shipments(company_id);
create index shipments_status_idx on public.shipments(status);
create index shipments_updated_at_idx on public.shipments(updated_at desc);
create index cargo_items_shipment_id_idx on public.cargo_items(shipment_id);
create index shipment_parties_shipment_id_idx on public.shipment_parties(shipment_id);
create index documents_shipment_id_idx on public.documents(shipment_id);
create index shipment_events_shipment_id_idx on public.shipment_events(shipment_id);
create index comments_shipment_id_idx on public.comments(shipment_id);
create index share_links_shipment_id_idx on public.share_links(shipment_id);
create index bill_of_lading_records_shipment_id_idx on public.bill_of_lading_records(shipment_id);
create index audit_logs_shipment_id_idx on public.audit_logs(shipment_id);
create index notifications_recipient_id_idx on public.notifications(recipient_id, is_read);

create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_shipments_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();

create trigger set_cargo_items_updated_at
before update on public.cargo_items
for each row execute function public.set_updated_at();

create trigger set_shipment_parties_updated_at
before update on public.shipment_parties
for each row execute function public.set_updated_at();

create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger set_shipment_events_updated_at
before update on public.shipment_events
for each row execute function public.set_updated_at();

create trigger set_bill_of_lading_records_updated_at
before update on public.bill_of_lading_records
for each row execute function public.set_updated_at();

create trigger set_feedback_updated_at
before update on public.feedback
for each row execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.shipments enable row level security;
alter table public.cargo_items enable row level security;
alter table public.shipment_parties enable row level security;
alter table public.documents enable row level security;
alter table public.shipment_events enable row level security;
alter table public.comments enable row level security;
alter table public.share_links enable row level security;
alter table public.bill_of_lading_records enable row level security;
alter table public.feedback enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

create policy "Members can read their company"
on public.companies for select
to authenticated
using (id = public.current_company_id());

create policy "Admins can update their company"
on public.companies for update
to authenticated
using (id = public.current_company_id() and public.current_user_role() = 'admin')
with check (id = public.current_company_id() and public.current_user_role() = 'admin');

create policy "Members can read company profiles"
on public.profiles for select
to authenticated
using (company_id = public.current_company_id());

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and company_id = public.current_company_id());

create policy "Admins can manage company profiles"
on public.profiles for all
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() = 'admin')
with check (company_id = public.current_company_id() and public.current_user_role() = 'admin');

create policy "Members can read company shipments"
on public.shipments for select
to authenticated
using (company_id = public.current_company_id());

create policy "Admins and shippers can create shipments"
on public.shipments for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and public.current_user_role() in ('admin', 'shipper')
);

create policy "Admins and shippers can update shipments"
on public.shipments for update
to authenticated
using (
  company_id = public.current_company_id()
  and public.current_user_role() in ('admin', 'shipper')
)
with check (
  company_id = public.current_company_id()
  and public.current_user_role() in ('admin', 'shipper')
);

create policy "Admins can delete shipments"
on public.shipments for delete
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() = 'admin');

create policy "Members can read company cargo"
on public.cargo_items for select
to authenticated
using (company_id = public.current_company_id());

create policy "Admins and shippers can manage cargo"
on public.cargo_items for all
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'))
with check (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'));

create policy "Members can read company parties"
on public.shipment_parties for select
to authenticated
using (company_id = public.current_company_id());

create policy "Admins and shippers can manage parties"
on public.shipment_parties for all
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'))
with check (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'));

create policy "Members can read company documents"
on public.documents for select
to authenticated
using (company_id = public.current_company_id());

create policy "Admins and shippers can manage documents"
on public.documents for all
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'))
with check (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'));

create policy "Members can read company events"
on public.shipment_events for select
to authenticated
using (company_id = public.current_company_id());

create policy "Admins and shippers can manage events"
on public.shipment_events for all
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'))
with check (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'));

create policy "Members can read company comments"
on public.comments for select
to authenticated
using (company_id = public.current_company_id());

create policy "Members can add comments"
on public.comments for insert
to authenticated
with check (company_id = public.current_company_id());

create policy "Admins can manage comments"
on public.comments for all
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() = 'admin')
with check (company_id = public.current_company_id() and public.current_user_role() = 'admin');

create policy "Admins can manage share links"
on public.share_links for all
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() = 'admin')
with check (company_id = public.current_company_id() and public.current_user_role() = 'admin');

create policy "Members can read B/L records"
on public.bill_of_lading_records for select
to authenticated
using (company_id = public.current_company_id());

create policy "Admins and shippers can manage B/L records"
on public.bill_of_lading_records for all
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'))
with check (company_id = public.current_company_id() and public.current_user_role() in ('admin', 'shipper'));

create policy "Members can read company feedback"
on public.feedback for select
to authenticated
using (company_id = public.current_company_id());

create policy "Members can create feedback"
on public.feedback for insert
to authenticated
with check (company_id = public.current_company_id());

create policy "Admins can manage feedback"
on public.feedback for all
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() = 'admin')
with check (company_id = public.current_company_id() and public.current_user_role() = 'admin');

create policy "Members can read company audit logs"
on public.audit_logs for select
to authenticated
using (company_id = public.current_company_id());

create policy "Admins can create audit logs"
on public.audit_logs for insert
to authenticated
with check (company_id = public.current_company_id());

create policy "Users can read their notifications"
on public.notifications for select
to authenticated
using (
  company_id = public.current_company_id()
  and (recipient_id = auth.uid() or public.current_user_role() = 'admin')
);

create policy "Users can update their notifications"
on public.notifications for update
to authenticated
using (company_id = public.current_company_id() and recipient_id = auth.uid())
with check (company_id = public.current_company_id() and recipient_id = auth.uid());

create policy "Admins can manage notifications"
on public.notifications for all
to authenticated
using (company_id = public.current_company_id() and public.current_user_role() = 'admin')
with check (company_id = public.current_company_id() and public.current_user_role() = 'admin');

insert into storage.buckets (id, name, public)
values ('shipment-documents', 'shipment-documents', false)
on conflict (id) do nothing;

create policy "Members can upload company shipment documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'shipment-documents'
  and (storage.foldername(name))[1] = 'company'
  and (storage.foldername(name))[2] = public.current_company_id()::text
);

create policy "Members can read company shipment documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'shipment-documents'
  and (storage.foldername(name))[1] = 'company'
  and (storage.foldername(name))[2] = public.current_company_id()::text
);

create policy "Members can update company shipment documents"
on storage.objects for update
to authenticated
using (
  bucket_id = 'shipment-documents'
  and (storage.foldername(name))[1] = 'company'
  and (storage.foldername(name))[2] = public.current_company_id()::text
)
with check (
  bucket_id = 'shipment-documents'
  and (storage.foldername(name))[1] = 'company'
  and (storage.foldername(name))[2] = public.current_company_id()::text
);
