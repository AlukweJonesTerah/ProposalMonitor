# Hybrid proposal pipeline

`proposal_hybrid_monitor.py` is the deployed monitor. It keeps website access
deterministic and source-controlled, then uses Gemini only to classify and
extract records from the collected raw content.

```text
approved source sites -> raw_candidates -> Gemini classifications -> Excel + myGov alert
                         scrape_runs         proposal_classifications
```

## One-time database setup

Run both migrations in Supabase SQL Editor, in this order:

1. `Migrations/010_add_proposal_tracking.sql`
2. `Migrations/011_add_hybrid_scraping_pipeline.sql`

The second migration adds the audit trail tables: `scrape_runs`,
`raw_candidates`, and `proposal_classifications`.

3. `Migrations/012_add_proposal_scorecard.sql`

The scorecard adds relevance, evidence, eligibility, and recommended-action
fields to each AI classification. These appear in the `Proposals` Excel sheet.

## Run

Set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `GEMINI_API_KEY` in `.env`,
then run:

```powershell
python proposal_hybrid_monitor.py
```

`AI_CLASSIFICATION_LIMIT` defaults to 30. All eligible raw candidates are
stored in Supabase, but the limit bounds the number sent to Gemini in one run.
Increase it only after checking cost and classification quality. If Gemini is
not configured, the monitor uses deterministic keyword classification and
records that model choice in Supabase.

`GEMINI_BATCH_SIZE` defaults to 10. A 30-item limit therefore uses three
smaller Gemini requests, which keeps structured-output requests reliable.

Use `--classification-mode gemini` to require Gemini, or
`--classification-mode deterministic` for a no-AI run. Add `--mygov-alert`
for the Tuesday/Thursday alert execution.
