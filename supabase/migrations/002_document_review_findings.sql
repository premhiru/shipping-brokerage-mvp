alter table public.documents
add column if not exists extracted_fields jsonb not null default '{}'::jsonb,
add column if not exists review_findings jsonb not null default '[]'::jsonb,
add column if not exists review_summary text;
