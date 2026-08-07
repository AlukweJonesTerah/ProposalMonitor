"""Send approved content files to an n8n webhook and archive accepted items."""

from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
CONTENT_ROOT = ROOT / "content"
APPROVED = CONTENT_ROOT / "approved"
PUBLISHED = CONTENT_ROOT / "published"
FAILED = CONTENT_ROOT / "failed"
REQUIRED_FIELDS = ("title", "body", "platform", "approval_status", "approved_by")


def ensure_folders() -> None:
    for folder in (CONTENT_ROOT / "inbox", APPROVED, PUBLISHED, FAILED):
        folder.mkdir(parents=True, exist_ok=True)


def validate(item: dict) -> list[str]:
    missing = [field for field in REQUIRED_FIELDS if not item.get(field)]
    if item.get("approval_status", "").lower() != "approved":
        missing.append("approval_status must be approved")
    return missing


def record_failure(path: Path, message: str) -> None:
    FAILED.mkdir(parents=True, exist_ok=True)
    (FAILED / f"{path.stem}.error.txt").write_text(
        f"{datetime.now(timezone.utc).isoformat()}\n{message}\n", encoding="utf-8"
    )


def dispatch_file(path: Path, webhook_url: str) -> bool:
    try:
        item = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        record_failure(path, f"Invalid JSON: {error}")
        return False

    problems = validate(item)
    if problems:
        record_failure(path, "; ".join(problems))
        return False

    payload = {**item, "content_file": path.name, "submitted_at": datetime.now(timezone.utc).isoformat()}
    try:
        response = requests.post(webhook_url, json=payload, timeout=45)
        response.raise_for_status()
    except requests.RequestException as error:
        record_failure(path, f"Webhook delivery failed: {error}")
        return False

    receipt = {"dispatched_at": datetime.now(timezone.utc).isoformat(), "webhook_url": webhook_url, "response_status": response.status_code, "content": item}
    destination = PUBLISHED / path.name
    path.replace(destination)
    (PUBLISHED / f"{path.stem}.receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    print(f"Queued approved content: {path.name}")
    return True


def dispatch_once(webhook_url: str) -> int:
    ensure_folders()
    processed = 0
    for path in sorted(APPROVED.glob("*.json")):
        processed += int(dispatch_file(path, webhook_url))
    return processed


def main() -> int:
    parser = argparse.ArgumentParser(description="Dispatch approved content to n8n.")
    parser.add_argument("--once", action="store_true", help="Process approved files once, then exit.")
    args = parser.parse_args()
    webhook_url = os.getenv("CONTENT_PUBLISH_WEBHOOK_URL")
    if not webhook_url:
        raise SystemExit("Set CONTENT_PUBLISH_WEBHOOK_URL before starting content dispatch.")
    interval = max(10, int(os.getenv("CONTENT_DISPATCH_INTERVAL_SECONDS", "60")))
    while True:
        dispatch_once(webhook_url)
        if args.once:
            return 0
        time.sleep(interval)


if __name__ == "__main__":
    raise SystemExit(main())
