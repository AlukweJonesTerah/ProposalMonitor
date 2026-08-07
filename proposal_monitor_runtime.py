"""Collect keyword-matched proposal opportunities into an Excel workplan."""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import re
import smtplib
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter
from pypdf import PdfReader

# Some public tender portals host malformed but still readable PDFs. pypdf logs
# a warning for every broken cross-reference it repairs, which can overwhelm a
# normal monitoring run. The extraction result remains available to the code.
logging.getLogger("pypdf").setLevel(logging.ERROR)

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "proposal_output"
WORKFLOW_STATE_FILE = OUTPUT / "proposal_workflow_state.json"
PENDING_SOURCE_FILE = ROOT / "Migrations" / "pending_source_intake.json"
DISCOVERY_TERMS = ("tender", "proposal", "rfp", "consultancy", "procurement")
DATE_PATTERNS = (
    re.compile(
        r"(?:closing date|deadline|due date|submission date|submit(?:ted)? by|closes? on|on or before|received on or before)"
        r"[^.\n]{0,100}?(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*20\d{2})",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:closing date|deadline|due date|submission date|submit(?:ted)? by|closes? on|on or before|received on or before)"
        r"[^.\n]{0,100}?((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*20\d{2})",
        re.IGNORECASE,
    ),
)


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def canonical_url(url: str) -> str:
    """Make equivalent portal links comparable and remove page fragments."""
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, "", parsed.query, ""))


def allowed(url: str, domains: list[str]) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return any(host == domain or host.endswith(f".{domain}") for domain in domains)


def due_date(text: str) -> str:
    for pattern in DATE_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        raw = re.sub(r"(?<=\d)(?:st|nd|rd|th)\b", "", match.group(1), flags=re.IGNORECASE).replace(",", "")
        for format_string in ("%d %B %Y", "%B %d %Y"):
            try:
                return datetime.strptime(raw, format_string).date().isoformat()
            except ValueError:
                pass
    return "Not stated"


def category(matches: list[str]) -> str:
    terms = " ".join(matches).lower()
    if "data science" in terms:
        return "Data science"
    if "analytics" in terms:
        return "Analytics"
    if "training" in terms:
        return "Training"
    return "Other"


def fetch(session: requests.Session, url: str) -> tuple[str, str]:
    response = session.get(url, timeout=30, headers={"User-Agent": "ProposalMonitor/1.0"})
    response.raise_for_status()
    content_type = response.headers.get("content-type", "").lower()
    if "pdf" in content_type or urlparse(url).path.lower().endswith(".pdf"):
        text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(response.content)).pages)
        return "pdf", text
    return "html", response.text


def collect(session: requests.Session, source: dict, keywords: list[str]) -> list[dict[str, str]]:
    candidates: dict[str, str] = {}
    start_pages = {canonical_url(url) for url in source["start_urls"]}
    for start_url in source["start_urls"]:
        try:
            _, body = fetch(session, start_url)
            soup = BeautifulSoup(body, "html.parser")
        except requests.RequestException as error:
            print(f"Warning: could not read {start_url}: {error}")
            continue
        for anchor in soup.find_all("a", href=True):
            link = urljoin(start_url, anchor["href"])
            canonical = canonical_url(link)
            label = clean(anchor.get_text(" ", strip=True))
            # Navigation links such as "All Tenders" are portal indexes, not
            # opportunities. They otherwise match generic keywords in their page text.
            is_portal_index = label.casefold() in {"all tenders", "tenders", "procurement"}
            if allowed(canonical, source["allowed_domains"]) and canonical not in start_pages and not is_portal_index:
                candidates[canonical] = label

    results = []
    for link, label in list(candidates.items())[: source.get("max_links", 80)]:
        hint = f"{label} {link}".lower()
        if not any(word.lower() in hint for word in keywords) and not any(term in hint for term in DISCOVERY_TERMS):
            continue
        try:
            kind, body = fetch(session, link)
        except (requests.RequestException, OSError):
            continue
        if kind == "pdf":
            text = clean(body)
            title = label or text[:160]
        else:
            soup = BeautifulSoup(body, "html.parser")
            title_tag = soup.find("h1") or soup.find("title")
            title = clean(title_tag.get_text(" ", strip=True) if title_tag else label)
            text = clean(soup.get_text(" ", strip=True))
        matches = [word for word in keywords if word.lower() in f"{title} {text}".lower()]
        if matches:
            results.append({"name": title or label or "Untitled proposal", "category": category(matches), "link": link, "due_date": due_date(text), "source": source["name"], "keywords": ", ".join(matches)})
    print(f"Checked {source['name']}: {len(candidates)} candidate link(s), {len(results)} matching proposal(s).")
    return results


def active_sources(config: dict) -> list[dict]:
    """Validate source entries and return only sites approved for monitoring."""
    valid = []
    for source in config.get("sources", []):
        if not source.get("active", True):
            print(f"Skipping inactive source: {source.get('name', 'Unnamed source')}")
            continue
        required = ("name", "start_urls", "allowed_domains")
        if not all(source.get(field) for field in required):
            print(f"Skipping incomplete source: {source.get('name', 'Unnamed source')}")
            continue
        valid.append(source)
    return valid


def format_sheet(sheet, headings: list[str]) -> None:
    for cell in sheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="1F4E78")
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    for index in range(1, len(headings) + 1):
        sheet.column_dimensions[get_column_letter(index)].width = min(60, max(14, max(len(str(row[index - 1].value or "")) for row in sheet.iter_rows()) + 2))


def add_sheet(book: Workbook, name: str, headings: list[str], rows: list[list[str]]) -> None:
    sheet = book.create_sheet(name)
    sheet.append(headings)
    for row in rows:
        sheet.append(row)
    format_sheet(sheet, headings)


def item_id(item: dict[str, str]) -> str:
    return hashlib.sha256(f"{item['link']}|{item['name']}".encode()).hexdigest()[:16]


def load_workflow_state() -> dict[str, dict[str, str]]:
    if not WORKFLOW_STATE_FILE.exists():
        return {}
    return json.loads(WORKFLOW_STATE_FILE.read_text(encoding="utf-8"))


def review_due_date(item: dict[str, str], today: date) -> str:
    """Review deadline is three days before tender close, or two days after discovery."""
    if item["due_date"] != "Not stated":
        return max(today, datetime.fromisoformat(item["due_date"]).date() - timedelta(days=3)).isoformat()
    return (today + timedelta(days=2)).isoformat()


def sync_workflow(proposals: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    """Create persistent review tasks for newly discovered proposals."""
    state = load_workflow_state()
    today = date.today()
    for item in proposals:
        proposal_key = item_id(item)
        task = state.setdefault(proposal_key, {
            "status": "Review required",
            "owner": "Project team",
            "first_seen": today.isoformat(),
            "review_due_date": review_due_date(item, today),
        })
        task["title"] = item["name"]
        task["link"] = item["link"]
        task["last_seen"] = today.isoformat()
    OUTPUT.mkdir(exist_ok=True)
    WORKFLOW_STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
    return state


def source_register_rows(sources: list[dict] | None) -> list[list[str]]:
    """Show both configured and user-submitted sources in the workbook."""
    rows = []
    for source in sources or []:
        rows.append([source.get("name", ""), ", ".join(source.get("start_urls", [])), source.get("source_type", ""), "", source.get("check_frequency", ""), str(source.get("active", True)).lower(), source.get("notes", "")])
    if not PENDING_SOURCE_FILE.exists():
        return rows
    try:
        pending = json.loads(PENDING_SOURCE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        print("Warning: pending source intake is not valid JSON; it was omitted from the workbook.")
        return rows
    for item in pending:
        rows.append(["User submitted", item.get("url", ""), "Pending review", "", "", "false", f"Submitted {item.get('submitted_at', '')}"])
    return rows


def export(proposals: list[dict[str, str]], output: Path, workflow_state: dict[str, dict[str, str]], sources: list[dict] | None = None) -> None:
    book = Workbook()
    proposals_sheet = book.active
    proposals_sheet.title = "Proposals"
    headings = ["Tracker ID", "Proposal name", "Category", "Website link", "Due date", "Source", "Matched keywords", "Status", "Owner", "Date found", "Notes"]
    proposals_sheet.append(headings)
    for item in sorted(proposals, key=lambda row: (row["due_date"] == "Not stated", row["due_date"], row["name"].lower())):
        deadline = datetime.fromisoformat(item["due_date"]).date() if item["due_date"] != "Not stated" else "Not stated"
        task = workflow_state[item_id(item)]
        proposals_sheet.append([item_id(item), item["name"], item["category"], item["link"], deadline, item["source"], item["keywords"], task["status"], task["owner"], date.today(), ""])
    format_sheet(proposals_sheet, headings)
    for cell in proposals_sheet["E"][1:]:
        if isinstance(cell.value, date):
            cell.number_format = "yyyy-mm-dd"
    for cell in proposals_sheet["J"][1:]:
        cell.number_format = "yyyy-mm-dd"
    run_date = date.today()
    workplan_headings = ["Task", "Owner", "Start date", "Due date", "Status", "Dependencies", "Notes"]
    workplan_rows = [
        ["Provide and prioritise source website links", "Olivia", run_date, run_date + timedelta(days=2), "Not started", "", "Add approved ministry and donor portals to the source intake."],
        ["Confirm keywords and exclusion terms", "Olivia", run_date, run_date + timedelta(days=2), "Not started", "Source list", "Confirm analytics, data science, training, and exclusion terms."],
        ["Add approved sources and complete a test scrape", "Technical owner", run_date + timedelta(days=3), run_date + timedelta(days=5), "Not started", "Olivia source links", "Activate and validate each source before recurring monitoring."],
        ["Configure Tuesday/Thursday myGov alert recipient", "Olivia / Technical owner", run_date + timedelta(days=3), run_date + timedelta(days=7), "Not started", "SMTP access", "Set alert recipient and SMTP details in .env."],
        ["Review new opportunities and assign a proposal owner", "Project team", run_date + timedelta(days=5), run_date + timedelta(days=12), "Ongoing", "Proposal tracker", "Update proposal status, owner, and notes after each scan."],
        ["Define content-folder approval and posting workflow", "Olivia / Content owner", run_date + timedelta(days=7), run_date + timedelta(days=14), "Not started", "Content folder", "Confirm approval steps before connecting posting automation."],
        ["Review performance and refine keywords", "Project team", run_date + timedelta(days=14), run_date + timedelta(days=21), "Not started", "Two weeks of results", "Remove irrelevant results and add useful new terms."],
    ]
    add_sheet(book, "Workplan", workplan_headings, workplan_rows)
    for cell in book["Workplan"]["C"][1:] + book["Workplan"]["D"][1:]:
        cell.number_format = "yyyy-mm-dd"
    add_sheet(book, "Website Register", ["Source name", "Website URL", "Type", "Priority", "Check frequency", "Active", "Notes"], source_register_rows(sources))
    add_sheet(book, "Keywords", ["Keyword", "Category", "Include / Exclude", "Notes"], [["analytics", "Analytics", "Include", ""], ["data science", "Data science", "Include", ""], ["training", "Training", "Include", ""]])
    add_sheet(book, "Content Calendar", ["Content item", "Platform", "Owner", "Approval status", "Posting date", "Published", "Notes"], [])
    queue_rows = []
    for item in proposals:
        task = workflow_state[item_id(item)]
        queue_rows.append([item_id(item), item["name"], "Review proposal and assign a bid decision", task["owner"], datetime.fromisoformat(task["review_due_date"]).date(), task["status"], item["link"]])
    add_sheet(book, "Workflow Queue", ["Tracker ID", "Proposal", "Next action", "Owner", "Review due date", "Status", "Link"], queue_rows)
    for cell in book["Workflow Queue"]["E"][1:]:
        cell.number_format = "yyyy-mm-dd"
    add_sheet(book, "Workflows", ["Workflow", "Trigger", "Automated action", "Owner", "Output / escalation"], [["Proposal discovery", "Scheduled monitoring finds a keyword match", "Create or update a persistent review task", "Project team", "Workflow Queue; review due date is three days before tender close."], ["myGov alert", "Tuesday/Thursday scheduler finds new matches", "Send one email per new opportunity", "Project team", "Scheduler waits for SMTP configuration and prevents repeat alerts."], ["Proposal review", "Workflow Queue contains Review required", "Assess relevance and set bid decision", "Proposal owner", "Update the workflow state using the command below."], ["Content publishing", "Content receives approval", "Queue item for posting automation", "Content owner", "To be connected when the content folder/platform is provided."]])
    output.parent.mkdir(exist_ok=True)
    book.save(output)


def email_alert(items: list[dict[str, str]]) -> bool:
    required = [os.getenv("ALERT_EMAIL_TO"), os.getenv("SMTP_HOST"), os.getenv("SMTP_USERNAME"), os.getenv("SMTP_PASSWORD")]
    if not all(required):
        print("No email sent: set ALERT_EMAIL_TO and SMTP_* in .env.")
        return False
    message = EmailMessage()
    message["Subject"] = f"myGov proposal alert: {len(items)} new match(es)"
    message["From"] = os.getenv("SMTP_FROM") or os.getenv("SMTP_USERNAME")
    message["To"] = os.environ["ALERT_EMAIL_TO"]
    message.set_content("New myGov proposals matching your keywords:\n\n" + "\n\n".join(f"{item['name']}\nCategory: {item['category']}\nDue: {item['due_date']}\n{item['link']}" for item in items))
    with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "587"))) as smtp:
        smtp.starttls()
        smtp.login(os.environ["SMTP_USERNAME"], os.environ["SMTP_PASSWORD"])
        smtp.send_message(message)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect matching proposals and export a workplan.")
    parser.add_argument("--config", type=Path, default=ROOT / "Migrations" / "proposal_source.json")
    parser.add_argument("--output", type=Path, default=OUTPUT / "proposals.xlsx")
    parser.add_argument("--mygov-alert", action="store_true")
    parser.add_argument("--set-workflow", nargs=3, metavar=("TRACKER_ID", "STATUS", "OWNER"), help="Update a review task, for example: --set-workflow abc123 Reviewing Olivia")
    args = parser.parse_args()
    load_dotenv(ROOT / ".env")
    if args.set_workflow:
        tracker_id, status, owner = args.set_workflow
        state = load_workflow_state()
        if tracker_id not in state:
            raise SystemExit(f"Unknown tracker ID: {tracker_id}")
        state[tracker_id]["status"] = status
        state[tracker_id]["owner"] = owner
        WORKFLOW_STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
        print(f"Updated {tracker_id}: {status} ({owner})")
        return 0
    config = json.loads(args.config.read_text(encoding="utf-8-sig"))
    sources = active_sources(config)
    if not sources:
        raise SystemExit("No active, valid sources found. Add approved websites to Migrations/proposal_source.json.")
    print(f"Checking {len(sources)} active source(s) for: {', '.join(config['keywords'])}")
    with requests.Session() as session:
        found = [item for source in sources for item in collect(session, source, config["keywords"])]
    proposals = list({item["link"]: item for item in found}.values())
    workflow_state = sync_workflow(proposals)
    export(proposals, args.output, workflow_state, config.get("sources"))
    print(f"Saved {len(proposals)} matching proposal(s) to {args.output}")
    if args.mygov_alert:
        state = OUTPUT / "mygov_seen.json"
        seen = set(json.loads(state.read_text()) if state.exists() else [])
        new = [item for item in proposals if item["source"].lower().startswith("mygov") and item_id(item) not in seen]
        if new and email_alert(new):
            state.write_text(json.dumps(sorted(seen | {item_id(item) for item in new}), indent=2))
        elif not new:
            print("No new myGov matches.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
