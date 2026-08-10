-- Adds decision-support fields to AI classifications.

alter table public.proposal_classifications
  add column if not exists relevance_score text,
  add column if not exists match_reason text,
  add column if not exists eligibility_notes text,
  add column if not exists recommended_action text;

create index if not exists proposal_classifications_score_idx
  on public.proposal_classifications(relevance_score);
