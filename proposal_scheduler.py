"""Run proposal monitoring repeatedly without requiring a manual Docker command."""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent


def enabled(name: str) -> bool:
    return os.getenv(name, "false").strip().lower() in {"1", "true", "yes", "on"}


def run(script: str, *args: str) -> None:
    print(f"Starting {script}...", flush=True)
    result = subprocess.run([sys.executable, script, *args], cwd=ROOT, check=False)
    if result.returncode:
        print(f"{script} finished with exit status {result.returncode}; the next scheduled run will retry.", flush=True)


def main() -> None:
    load_dotenv(ROOT / ".env")
    interval = max(300, int(os.getenv("PROPOSAL_MONITOR_INTERVAL_SECONDS", "21600")))
    while True:
        # --mygov-alert emails only newly discovered myGov Kenya opportunities
        # (tracked in mygov_seen.json), separate from the Tue/Thu digest that
        # mygov_alert_scheduler.py sends for all current high/medium items.
        run("proposal_hybrid_monitor.py", "--mygov-alert")
        # Public discovery is opt-in because it consumes the configured search/API budget.
        if enabled("ENABLE_PUBLIC_WEB_DISCOVERY"):
            run("proposal_research_agent.py")
        print(f"Next proposal monitor run in {interval // 60} minute(s).", flush=True)
        time.sleep(interval)


if __name__ == "__main__":
    main()
