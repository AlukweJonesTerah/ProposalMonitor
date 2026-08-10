"""Run the myGov proposal alert once every Tuesday and Thursday in Nairobi time."""

from __future__ import annotations

import argparse
import json
import os
import smtplib
import subprocess
import sys
import time
from datetime import datetime, time as clock_time
from email.message import EmailMessage
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

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


def send_test_email() -> int:
    """Send one SMTP test email without running the scraper or changing alert state."""
    if not smtp_ready():
        return 1
    message = EmailMessage()
    message["Subject"] = "myGov proposal alert: SMTP test"
    message["From"] = os.getenv("SMTP_FROM") or os.environ["SMTP_USERNAME"]
    message["To"] = os.environ["ALERT_EMAIL_TO"]
    message.set_content("This is a test of the Proposal Monitor SMTP configuration. No proposal alert was sent.")
    try:
        with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "587"))) as smtp:
            smtp.starttls()
            smtp.login(os.environ["SMTP_USERNAME"], os.environ["SMTP_PASSWORD"])
            smtp.send_message(message)
    except smtplib.SMTPAuthenticationError:
        print("SMTP authentication failed. For Gmail, enable 2-Step Verification and use a Google App Password as SMTP_PASSWORD.", file=sys.stderr)
        return 1
    except smtplib.SMTPException as error:
        print(f"SMTP test failed: {error}", file=sys.stderr)
        return 1
    print(f"SMTP test email sent to {os.environ['ALERT_EMAIL_TO']}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Run or test the myGov alert scheduler.")
    parser.add_argument("--test-email", action="store_true", help="Send one SMTP test email, then exit.")
    args = parser.parse_args()
    load_dotenv(ROOT / ".env")
    if args.test_email:
        return send_test_email()
    print(f"myGov alert scheduler started; Tuesdays and Thursdays at {alert_time().strftime('%H:%M')} Africa/Nairobi.")
    while True:
        now = datetime.now(TIMEZONE)
        if is_due(now, load_last_run()) and smtp_ready():
            result = subprocess.run([sys.executable, "proposal_hybrid_monitor.py", "--mygov-alert"], cwd=ROOT, check=False)
            if result.returncode == 0:
                save_last_run(now.date().isoformat())
                print(f"myGov alert check completed for {now.date().isoformat()}.")
            else:
                print(f"myGov alert check failed (exit code {result.returncode}); it will retry.")
        time.sleep(60)


if __name__ == "__main__":
    raise SystemExit(main())
