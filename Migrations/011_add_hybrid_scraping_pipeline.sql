-- Run 010_add_proposal_tracking.sql first.
-- Durable audit trail for the collector -> AI classifier -> report pipeline.

create extension if not exists pgcrypto;

create table if not exists public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  candidate_count integer not null default 0,
  classified_count integer not null default 0,
  relevant_count integer not null default 0,
  error text
);

create table if not exists public.raw_candidates (
  id text primary key,
  proposal_source_id uuid not null references public.proposal_sources(id) on delete cascade,
  scrape_run_id uuid references public.scrape_runs(id) on delete set null,
  source_name text not null,
  url text not null unique,
  title text,
  raw_content text not null,
  content_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  scraped_at timestamptz not null default now()
);

create index if not exists raw_candidates_source_idx on public.raw_candidates(proposal_source_id);
create index if not exists raw_candidates_run_idx on public.raw_candidates(scrape_run_id);

create table if not exists public.proposal_classifications (
  id uuid primary key default gen_random_uuid(),
  raw_candidate_id text not null unique references public.raw_candidates(id) on delete cascade,
  is_relevant boolean not null,
  proposal_name text,
  category text,
  due_date date,
  matched_keywords text[] not null default '{}',
  confidence numeric(4,3),
  model text not null,
  review_status text not null default 'pending_review',
  agent_response jsonb,
  classified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_classifications_relevant_idx on public.proposal_classifications(is_relevant);
create index if not exists proposal_classifications_review_idx on public.proposal_classifications(review_status);

comment on table public.scrape_runs is 'Audit record for every hybrid proposal-monitor run.';
comment on table public.raw_candidates is 'Raw, source-controlled candidate content collected before AI classification.';
comment on table public.proposal_classifications is 'Gemini or deterministic classification for each raw candidate.';
