"""Run the myGov proposal alert once every Tuesday and Thursday in Nairobi time."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from datetime import datetime, time as clock_time
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
STATE_FILE = ROOT / "proposal_output" / "mygov_schedule_state.json"
TIMEZONE = ZoneInfo("Africa/Nairobi")
REQUIRED_SMTP_SETTINGS = ("ALERT_EMAIL_TO", "SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD")


def alert_time() -> clock_time:
    return clock_time(int(os.getenv("MYGOV_ALERT_HOUR", "9")), int(os.getenv("MYGOV_ALERT_MINUTE", "0")))


def is_due(now: datetime, last_run: str | None) -> bool:
    """Return true once per Tuesday/Thursday after the configured alert time."""
    return now.weekday() in (1, 3) and now.time() >= alert_time() and last_run != now.date().isoformat()


def load_last_run() -> str | None:
    if not STATE_FILE.exists():
        return None
    return json.loads(STATE_FILE.read_text()).get("last_run_date")


def save_last_run(run_date: str) -> None:
    STATE_FILE.parent.mkdir(exist_ok=True)
    STATE_FILE.write_text(json.dumps({"last_run_date": run_date}, indent=2))


def smtp_ready() -> bool:
    missing = [name for name in REQUIRED_SMTP_SETTINGS if not os.getenv(name)]
    if missing:
        print(f"myGov alert waiting for SMTP configuration: {', '.join(missing)}")
        return False
    return True


def main() -> int:
    print(f"myGov alert scheduler started; Tuesdays and Thursdays at {alert_time().strftime('%H:%M')} Africa/Nairobi.")
    while True:
        now = datetime.now(TIMEZONE)
        if is_due(now, load_last_run()) and smtp_ready():
            result = subprocess.run([sys.executable, "proposal_monitor_runtime.py", "--mygov-alert"], cwd=ROOT, check=False)
            if result.returncode == 0:
                save_last_run(now.date().isoformat())
                print(f"myGov alert check completed for {now.date().isoformat()}.")
            else:
                print(f"myGov alert check failed (exit code {result.returncode}); it will retry.")
        time.sleep(60)


if __name__ == "__main__":
    raise SystemExit(main())
