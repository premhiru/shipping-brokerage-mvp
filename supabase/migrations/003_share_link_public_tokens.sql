alter table public.share_links
add column if not exists public_token text;

update public.share_links
set public_token = 'share-' || id::text
where public_token is null;

create unique index if not exists share_links_public_token_idx
on public.share_links(public_token)
where public_token is not null;
