# Scriper Tester

This project now includes a simple Docker-based setup for running both a Python service and a Next.js web app without installing Node.js or Python packages on your machine.

## What is included

- A Next.js app served on port 3000
- A Python service running [proposal_monitor_runtime.py](proposal_monitor_runtime.py)
- A dedicated Python development container for iterative Python work
- Docker Compose orchestration for the web and Python services

## Prerequisites

Install Docker Desktop and make sure Docker is running on your machine.

## Run the project

From the project root, run:

```bash
docker compose up --build
```

This will start:

- the web app at http://localhost:3001
- the production Python container for the script

## Useful commands

Start in the background:

```bash
docker compose up -d --build
```

Stop everything:

```bash
docker compose down
```

Rebuild the web service:

```bash
docker compose build web
```

Rebuild the Python service:

```bash
docker compose build python
```

Rebuild the Python development service:

```bash
docker compose build python-dev
```

Run only the Python development container:

```bash
docker compose up python-dev
```

## Environment variables

The Python script can optionally write to Supabase if these environment variables are set:

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
```

If they are not set, the script will skip the write step.

### Supabase with Docker

The Docker web service can use Supabase from the browser, while the Python
monitor uses a separate server-only service key. Add these values to your local
`.env` (or `.env.local` when running Next.js outside Docker):

```ini
# Safe for the browser; Supabase calls must still be protected with RLS.
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Server-only: used by the Python monitor. Never expose this in browser code.
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

`.env` and `.env.local` are ignored by Git. Do not commit either file.

Start the web service after setting the public values:

```powershell
docker compose up --build web
```

The web service is available at `http://localhost:3001`. Docker passes only
the `NEXT_PUBLIC_*` values to the browser-facing service; the service-role key
is passed only to the Python services.

Before enabling Python writes, run
[Migrations/010_add_proposal_tracking.sql](Migrations/010_add_proposal_tracking.sql)
in the Supabase SQL Editor. It creates the `proposal_sources`, `proposals`, and
`proposal_alerts` tables.

## Adding more packages

### Python

To add Python packages, update [requirements.txt](requirements.txt) and rebuild the appropriate Python container:

```bash
docker compose build python
docker compose up -d python
```

For the development Python container:

```bash
docker compose build python-dev
docker compose up -d python-dev
```

Example:

```txt
requests
pandas
```

### Next.js

If you are using Docker for the web app, you can manage Node.js packages from inside the running container:

```bash
docker compose exec web npm install <package_name>
docker compose exec web npm install
docker compose exec web npm list
docker compose exec web npm uninstall <package_name>
docker compose exec web npm update
```

You can also rebuild the web container after changing [package.json](package.json):

```bash
docker compose build web
docker compose up -d web
```

## Production build and run

Build the production image:

```bash
docker build -t nextjs-prod-app .
```

Run the production container:

```bash
docker run -p 3000:3000 nextjs-prod-app
```

## Project structure

- [proposal_monitor_runtime.py](proposal_monitor_runtime.py) - runnable proposal monitor
- [Dockerfile](Dockerfile) - production build for the web app
- [Dockerfile.dev](Dockerfile.dev) - development build for the web app
- [Dockerfile.python](Dockerfile.python) - production Python container build
- [Dockerfile.python.dev](Dockerfile.python.dev) - development Python container build
- [docker-compose.yml](docker-compose.yml) - container orchestration
- [package.json](package.json) - Next.js dependencies and scripts

# Proposal monitoring backend

Scrapes government/donor tender pages for proposals matching configured
keywords, writes them to Excel and (optionally) Supabase, and can email a
myGov/GAA alert of newly-seen matches.

## Setup

```powershell
python -m pip install requests beautifulsoup4 openpyxl pypdf python-dotenv supabase
copy .env.example .env
# fill in .env: SUPABASE_URL / SUPABASE_SERVICE_KEY, and ALERT_EMAIL_TO / SMTP_* if you want alerts
```

Run the Supabase migration once, against your Supabase project:

```
migrations/010_add_proposal_tracking.sql
```

## Configure sources

Edit `proposal_sources.json`. Currently configured for GAA (the site
`mygov.go.ke` now redirects to):

```json
{
  "keywords": ["analytics", "data science", "training"],
  "sources": [
    {
      "name": "myGov Kenya",
      "start_urls": ["https://gaa.go.ke/index.php/all-tenders"],
      "allowed_domains": ["gaa.go.ke"],
      "max_links": 80
    }
  ]
}
```

Add more entries to `sources` for ministry sites or donor portals as they're
identified.

The starter configuration actively monitors myGov, Kenya Revenue Authority,
National Environment Management Authority, and Public Procurement Regulatory
Authority. Olivia can use the source intake file to add priority ministry,
donor, or sector-specific sites.

### Adding Olivia's websites

Use [Migrations/olivia_source_intake.csv](Migrations/olivia_source_intake.csv)
to collect each approved website, then add it to
[Migrations/proposal_source.json](Migrations/proposal_source.json). Each source
needs a name, a tender-listing URL, and its allowed domain. Set `active` to
`true` only after the link has been checked; inactive or incomplete entries are
skipped safely. [Migrations/proposal_source_template.json](Migrations/proposal_source_template.json)
contains the full multi-source format.

## Run

```powershell
python proposal_monitor_runtime.py
```

- Always writes `proposal_output/proposals.xlsx`.
- Writes/updates matching rows in Supabase's `proposals` table, unless
  `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` are unset (in which case it just
  skips that step and logs a note) or `--skip-supabase` is passed.
- Add `--mygov-alert` to email newly-seen myGov/GAA matches. Requires
  `ALERT_EMAIL_TO` and `SMTP_*` to be set in `.env`; tracks what's already
  been alerted on in `proposal_output/mygov_seen.json` so it never repeats.

## Tuesday and Thursday myGov alerts

`docker compose up -d mygov-alerts` starts a dedicated scheduler. It checks
for new myGov opportunities every Tuesday and Thursday at 09:00 in the
`Africa/Nairobi` timezone (adjust `MYGOV_ALERT_HOUR` and
`MYGOV_ALERT_MINUTE` in `.env` if needed). The scheduler waits until all
`SMTP_*` and `ALERT_EMAIL_TO` values are configured, so it cannot send an
email accidentally. It records each completed daily check in
`proposal_output/mygov_schedule_state.json`; the monitor separately prevents
the same opportunity from being emailed twice.

### Test email delivery

After adding `ALERT_EMAIL_TO` and `SMTP_*` values to `.env`, send one test
email without running the scraper or changing alert history:

```powershell
python mygov_alert_scheduler.py --test-email
```

For Gmail, use an App Password rather than your normal Google password:

1. Enable 2-Step Verification for the sending Google account.
2. Open Google Account **Security** > **App passwords** and create one named
   `Proposal Monitor`.
3. Put the generated password in `SMTP_PASSWORD`.

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_FROM=your-gmail@gmail.com
ALERT_EMAIL_TO=recipient@example.com
```

Never commit `.env` or share the SMTP password. If Google Workspace does not
show App passwords, ask the Workspace administrator to approve an SMTP method.

## Gemini-powered research agent

`proposal_research_agent.py` is an optional AI-assisted discovery path. It uses
Firecrawl to find and read approved-source pages, Gemini 3.5 Flash to extract
only structured proposal opportunities, and LangSmith to trace runs when its
credentials are configured. It has no effect on the standard scraper.

Set fresh, rotated `GEMINI_API_KEY`, `FIRECRAWL_API_KEY`, and optional
`LANGSMITH_API_KEY` values in `.env` (never commit them), then run:

```powershell
python proposal_research_agent.py
```

`URL_LIMIT` caps the total number of Firecrawl pages sent to Gemini and
`BATCH_LIMIT` caps concurrent source searches. The output is written to
`proposal_output/proposals_ai.xlsx` with the same workplan and workflow sheets
as the standard monitor. The default model is `gemini-3.5-flash`; change
`GEMINI_MODEL` only to a model available to your Gemini API account.

## Proposal review workflow

Every scraper run creates or updates a persistent review task in
`proposal_output/proposal_workflow_state.json` and adds it to the **Workflow
Queue** sheet in the Excel workbook. New items are assigned to `Project team`
and receive a review deadline three days before the tender due date (or two
days after discovery if no deadline is available).

Use the tracker ID from the Excel workbook to record a review decision:

```powershell
python proposal_monitor_runtime.py --set-workflow <TRACKER_ID> Reviewing Olivia
```

## Content folder and n8n posting handoff

The approval-gated content folder is in [content](content). Import
[automations/n8n-content-publishing-workflow.json](automations/n8n-content-publishing-workflow.json)
into n8n, then configure the `Publish to configured platform` HTTP Request
node with the selected platform's endpoint and credentials. The imported
workflow is inactive by default.

Start the handoff services with:

```powershell
docker compose up -d n8n content-dispatcher
```

Open n8n at `http://localhost:5678`, import the workflow, configure the
publishing node, and activate it. The dispatcher only processes files in
`content/approved` whose `approval_status` is `approved` and which name an
approver; drafts in `content/inbox` cannot be posted.

## Notes

- `status` and `alerted_at` on the `proposals` table are never overwritten
  by a re-scrape — `write_supabase()` explicitly excludes them from updates
  on existing rows, so alert tracking survives repeated runs.
- Row IDs are `sha256(link|title)[:16]` — rerunning against the same source
  updates existing rows instead of duplicating them.
- If a source's page turns out to be JavaScript-rendered (empty results
  despite the URL being correct), `requests`/`BeautifulSoup` won't see its
  content — that's the point to reach for a rendering-aware fetcher instead.
