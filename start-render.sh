#!/bin/sh
set -eu

# Render mounts the persistent disk after the image is built, owned by root.
# Fix its ownership at startup, then run the application without root access.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/proposal_output
  chown -R node:node /app/proposal_output
  exec su -s /bin/sh node -c /app/start-render.sh
fi

# Render only provides a writable persistent disk at /app/proposal_output.
# Seed editable source data once; subsequent deployments retain administrators'
# additions, approvals, edits, and removals.
if [ ! -f /app/proposal_output/proposal_source.json ]; then
  cp /app/Migrations/proposal_source.json /app/proposal_output/proposal_source.json
fi
if [ ! -f /app/proposal_output/pending_source_intake.json ]; then
  if [ -f /app/Migrations/pending_source_intake.json ]; then
    cp /app/Migrations/pending_source_intake.json /app/proposal_output/pending_source_intake.json
  else
    printf '[]\n' > /app/proposal_output/pending_source_intake.json
  fi
fi
# Pathways Technologies is a separately branded tenant sharing this service;
# seed its own editable source list the same way.
if [ ! -f /app/proposal_output/pathways_proposal_source.json ]; then
  cp /app/Migrations/pathways_proposal_source.json /app/proposal_output/pathways_proposal_source.json
fi

# This is an in-progress-process marker, never persistent application data.
# A prior deployment may have been stopped before it could remove the lock.
rm -f /app/proposal_output/.monitor.lock /app/proposal_output/pathways_.monitor.lock

# These schedulers write the proposal_output/ files consumed by the dashboard.
# Keep them in this service until the dashboard is migrated to read from a
# shared database or object store.
python proposal_scheduler.py &
monitor_pid=$!
python mygov_alert_scheduler.py &
alert_pid=$!
node server.js &
web_pid=$!

terminate_all() {
  kill -TERM "$monitor_pid" "$alert_pid" "$web_pid" 2>/dev/null || true
  wait "$monitor_pid" "$alert_pid" "$web_pid" 2>/dev/null || true
}

trap 'terminate_all; exit 0' INT TERM

# /api/health only proves the Next.js server answers; it says nothing about
# the scraper or myGov alert loops. Without this watchdog, either background
# process can die silently (an unhandled exception, OOM) while the container
# keeps reporting healthy and proposal_output/ goes stale for days. Exit
# non-zero so Render's restart policy brings all three processes back together.
while true; do
  sleep 30
  if ! kill -0 "$monitor_pid" 2>/dev/null; then
    echo "proposal_scheduler.py exited unexpectedly; restarting the container." >&2
    terminate_all; exit 1
  fi
  if ! kill -0 "$alert_pid" 2>/dev/null; then
    echo "mygov_alert_scheduler.py exited unexpectedly; restarting the container." >&2
    terminate_all; exit 1
  fi
  if ! kill -0 "$web_pid" 2>/dev/null; then
    echo "node server.js exited unexpectedly; restarting the container." >&2
    terminate_all; exit 1
  fi
done
