delete from public.companies
where id = '11111111-1111-4111-8111-111111111111';

insert into public.companies (id, name, slug)
values
  ('11111111-1111-4111-8111-111111111111', 'HarborBridge Logistics', 'harborbridge-logistics')
on conflict (id) do nothing;

insert into public.shipments (
  id,
  company_id,
  shipment_reference,
  shipper_name,
  consignee_name,
  notify_party,
  cargo_description,
  item_type,
  hs_code,
  package_count,
  dimensions,
  gross_weight_kg,
  net_weight_kg,
  volume_cbm,
  incoterm,
  origin,
  destination,
  pol,
  pod,
  container_type,
  preferred_etd,
  preferred_eta,
  carrier,
  booking_number,
  bl_number,
  container_number,
  status,
  document_status,
  bl_status,
  next_action,
  notes
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'HB-2026-0001',
    'Lion City Electronics Pte Ltd',
    'Rotterdam Device Distribution BV',
    'Rotterdam Device Distribution BV',
    'Consumer electronics and accessories',
    'Electronics',
    '8517.62',
    428,
    '40 cartons, mixed pallet stack',
    8420.000,
    7980.000,
    58.400,
    'FOB',
    'Singapore',
    'Rotterdam, Netherlands',
    'Singapore',
    'Rotterdam',
    '40HC',
    '2026-07-03',
    '2026-08-04',
    'Maersk',
    'MAEU-SG-48291',
    'MAEU760128391',
    'MSKU1234567',
    'booking_confirmed',
    'approved',
    'Draft B/L issued',
    'Client to approve draft B/L',
    'Priority retail replenishment shipment.'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '11111111-1111-4111-8111-111111111111',
    'HB-2026-0002',
    'Saigon Modern Furniture Co',
    'Pacific Home Imports LLC',
    'Pacific Home Imports LLC',
    'Flat-pack furniture sets',
    'Furniture',
    '9403.60',
    960,
    '960 cartons across 22 pallets',
    12600.000,
    11940.000,
    69.800,
    'CIF',
    'Ho Chi Minh City, Vietnam',
    'Los Angeles, USA',
    'Cat Lai',
    'Los Angeles',
    '40HC',
    '2026-07-08',
    '2026-08-01',
    'ONE',
    'ONEY-SGN-77018',
    null,
    'TCLU7788990',
    'shared_with_line',
    'shared_with_line',
    'Not issued',
    'Awaiting carrier booking confirmation',
    'Buyer requested earliest possible sailing.'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '11111111-1111-4111-8111-111111111111',
    'HB-2026-0003',
    'Andaman Fresh Seafood Ltd',
    'Tokyo Bay Foods KK',
    'Tokyo Bay Foods KK',
    'Frozen seafood, reefer controlled',
    'Reefer seafood',
    '0306.17',
    520,
    '520 foam boxes, reefer stow',
    9100.000,
    8700.000,
    42.200,
    'CFR',
    'Bangkok, Thailand',
    'Tokyo, Japan',
    'Laem Chabang',
    'Tokyo',
    '40RF',
    '2026-07-01',
    '2026-07-11',
    'Ocean Network Express',
    'ONEY-TH-22810',
    'ONEYTH22810SWB',
    'RFSU4455667',
    'in_transit',
    'accepted_by_line',
    'Sea waybill issued',
    'Monitor temperature logs and ETA',
    'Temperature set point -18 C.'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    '11111111-1111-4111-8111-111111111111',
    'HB-2026-0004',
    'Merlion Specialty Chemicals Pte Ltd',
    'Gulf Industrial Supplies FZE',
    'Gulf Industrial Supplies FZE',
    'DG chemicals, Class 3 flammable liquid',
    'Dangerous goods',
    '3814.00',
    80,
    '80 steel drums on 20 pallets',
    15200.000,
    14400.000,
    31.600,
    'DAP',
    'Singapore',
    'Dubai, UAE',
    'Singapore',
    'Jebel Ali',
    '20GP',
    '2026-07-12',
    '2026-07-28',
    'CMA CGM',
    null,
    null,
    null,
    'docs_review',
    'needs_review',
    'Not issued',
    'Resolve MSDS and DG declaration review comments',
    'Requires DG acceptance before booking request.'
  )
on conflict (id) do nothing;

insert into public.cargo_items (
  company_id,
  shipment_id,
  description,
  item_type,
  hs_code,
  package_count,
  length_cm,
  width_cm,
  height_cm,
  gross_weight_kg,
  net_weight_kg,
  volume_cbm
)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Routers, tablets, chargers, and accessories', 'Electronics', '8517.62', 428, 120, 100, 140, 8420, 7980, 58.4),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Flat-pack dining and bedroom furniture', 'Furniture', '9403.60', 960, 120, 100, 145, 12600, 11940, 69.8),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Frozen shrimp and mixed seafood cartons', 'Reefer seafood', '0306.17', 520, 100, 80, 105, 9100, 8700, 42.2),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Class 3 solvent blend in sealed steel drums', 'Dangerous goods', '3814.00', 80, 110, 110, 130, 15200, 14400, 31.6);

insert into public.documents (
  company_id,
  shipment_id,
  document_type,
  file_name,
  uploaded_by_name,
  uploaded_at,
  status,
  rejection_reason
)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'commercial_invoice', 'HB-2026-0001-commercial-invoice.pdf', 'Demo Admin', now() - interval '5 days', 'approved', null),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'packing_list', 'HB-2026-0001-packing-list.pdf', 'Demo Admin', now() - interval '5 days', 'approved', null),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'draft_bl', 'HB-2026-0001-draft-bl.pdf', 'Maersk Line Guest', now() - interval '1 day', 'uploaded', null),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'commercial_invoice', 'HB-2026-0002-commercial-invoice.pdf', 'Demo Shipper', now() - interval '3 days', 'shared_with_line', null),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'booking_confirmation', 'pending-booking-confirmation.pdf', null, null, 'not_uploaded', null),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'final_bl_sea_waybill', 'HB-2026-0003-sea-waybill.pdf', 'ONE Line Guest', now() - interval '2 days', 'accepted_by_line', null),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'msds', 'HB-2026-0004-msds.pdf', 'Demo Shipper', now() - interval '1 day', 'needs_review', 'UN number missing from page 2.'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'dg_declaration', 'HB-2026-0004-dg-declaration.pdf', 'Demo Shipper', now() - interval '1 day', 'needs_review', 'Carrier needs flash point confirmation.');

insert into public.shipment_events (
  company_id,
  shipment_id,
  milestone,
  status,
  event_timestamp,
  responsible_party,
  notes,
  source
)
select
  '11111111-1111-4111-8111-111111111111',
  shipment_id,
  milestone,
  status::public.milestone_status,
  event_timestamp,
  responsible_party,
  notes,
  source::public.event_source
from (
  values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'Draft created', 'completed', now() - interval '8 days', 'Broker', 'Shipment pack created.', 'manual'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'Documents reviewed', 'completed', now() - interval '4 days', 'Broker', 'Commercial invoice and packing list approved.', 'manual'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'Draft B/L issued', 'completed', now() - interval '1 day', 'Shipping line', 'Draft B/L uploaded for client review.', 'shipping_line_guest'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, 'Shared with shipping line', 'completed', now() - interval '2 days', 'Broker', 'Share link sent to carrier desk.', 'manual'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, 'Booking requested', 'in_progress', now() - interval '1 day', 'Shipping line', 'Carrier reviewing equipment availability.', 'shipping_line_guest'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid, 'Loaded on vessel', 'completed', now() - interval '2 days', 'Shipping line', 'Reefer loaded and sailing confirmed.', 'shipping_line_guest'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid, 'Vessel sailed', 'completed', now() - interval '1 day', 'System', 'Manual timeline updated by operations.', 'manual'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'::uuid, 'Documents reviewed', 'blocked', now() - interval '8 hours', 'Broker', 'DG documents need corrections before carrier submission.', 'manual')
) as seed_events(shipment_id, milestone, status, event_timestamp, responsible_party, notes, source);

insert into public.comments (
  company_id,
  shipment_id,
  user_name,
  user_role,
  message
)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Maersk Line Guest', 'shipping_line_guest', 'Draft B/L has been uploaded. Please confirm consignee address spelling.'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Demo Admin', 'admin', 'Address is under client review. Target approval by tomorrow.'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'ONE Booking Desk', 'shipping_line_guest', 'Equipment is available. Awaiting final shipping instructions.'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Demo Admin', 'admin', 'MSDS and DG declaration need revision before sharing with the line.');

insert into public.share_links (
  company_id,
  shipment_id,
  token_hash,
  recipient_company,
  recipient_name,
  recipient_email,
  expires_at
)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', encode(digest('demo-share-electronics', 'sha256'), 'hex'), 'Maersk', 'Maersk Line Guest', 'carrier-demo@example.com', now() + interval '30 days'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', encode(digest('demo-share-furniture', 'sha256'), 'hex'), 'ONE', 'ONE Booking Desk', 'carrier-demo@example.com', now() + interval '30 days')
on conflict (token_hash) do nothing;

insert into public.bill_of_lading_records (
  company_id,
  shipment_id,
  bl_number,
  bl_type,
  status,
  issued_at,
  notes
)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'MAEU760128391', 'Original B/L', 'Draft issued', now() - interval '1 day', 'Awaiting shipper approval.'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'ONEYTH22810SWB', 'Sea waybill', 'Issued', now() - interval '2 days', 'Final sea waybill issued.');

insert into public.feedback (
  company_id,
  submitted_by_name,
  page_or_feature,
  comment,
  priority,
  status
)
values
  ('11111111-1111-4111-8111-111111111111', 'Client Reviewer', 'Shipment detail tabs', 'The tabs make it easy to separate cargo, documents, and comments. Add a print/export pack later.', 'medium', 'open'),
  ('11111111-1111-4111-8111-111111111111', 'Client Reviewer', 'Dashboard', 'Please make delayed or blocked shipments more visually obvious.', 'high', 'reviewed');

insert into public.audit_logs (
  company_id,
  shipment_id,
  actor_name,
  actor_role,
  action,
  metadata
)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Demo Admin', 'admin', 'shipment_created', '{"reference":"HB-2026-0001"}'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Maersk Line Guest', 'shipping_line_guest', 'bl_uploaded', '{"document":"draft_bl"}'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Demo Admin', 'admin', 'shipment_shared', '{"recipient":"ONE Booking Desk"}'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Demo Admin', 'admin', 'document_rejected', '{"documents":["msds","dg_declaration"]}');

insert into public.notifications (
  company_id,
  shipment_id,
  title,
  message
)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Draft B/L ready', 'Maersk uploaded a draft B/L for HB-2026-0001.'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Documents need review', 'MSDS and DG declaration need corrections before carrier sharing.');
