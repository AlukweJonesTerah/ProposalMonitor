#!/bin/sh
set -eu

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
