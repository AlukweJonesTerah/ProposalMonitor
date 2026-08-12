# Deploying to Render

This repository includes a Render Blueprint in `render.yaml`. It deploys the
Next.js dashboard and the proposal/myGov schedulers together, because the
dashboard currently reads generated files from `proposal_output/`.

## Deploy

1. Commit and push these files to GitHub.
2. In Render, select **New** > **Blueprint**, connect the repository, and
   select `render.yaml`.
3. Enter each requested secret from `.env` in the Blueprint form. Do not add
   `.env` to Git.
4. Deploy the `scriper-tester` service and open `/api/health` after it is live.

The service uses the paid Starter plan because Render persistent disks are not
available on free services. The disk is mounted at `/app/proposal_output` and
keeps the dashboard results, spreadsheet, and scheduler state after restarts.

`CONTENT_PUBLISH_WEBHOOK_URL` and `content_dispatcher.py` are intentionally not
started in this first deployment. Configure n8n separately with a public HTTPS
webhook before enabling that integration.

## Time zone

The scheduler converts the current time to `Africa/Nairobi` itself, so
`MYGOV_ALERT_HOUR=9` and `MYGOV_ALERT_MINUTE=0` mean 09:00 Nairobi time.
