#!/bin/sh
set -eu

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

# These schedulers write the proposal_output/ files consumed by the dashboard.
# Keep them in this service until the dashboard is migrated to read from a
# shared database or object store.
python proposal_scheduler.py &
monitor_pid=$!
python mygov_alert_scheduler.py &
alert_pid=$!

stop() {
  kill -TERM "$monitor_pid" "$alert_pid" 2>/dev/null || true
  wait "$monitor_pid" "$alert_pid" 2>/dev/null || true
  exit 0
}

trap stop INT TERM
node server.js &
web_pid=$!
wait "$web_pid"
