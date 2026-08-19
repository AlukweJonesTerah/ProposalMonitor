// Minimal RFC 5545 calendar generation: one all-day VEVENT per opportunity
// with a stated deadline, plus a reminder 3 days before it — the same
// "review due" window proposal_monitor_runtime.py already uses for the
// Workflow Queue, so a subscribed calendar and the dashboard always agree.

function escapeText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Lines must not exceed 75 octets; continuation lines start with a space.
function foldLine(line) {
  if (line.length <= 75) return line;
  const parts = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
}

function timestamp(date) {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

function asAllDay(isoDate) {
  return isoDate.replace(/-/g, '');
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildEvent(proposal, uidDomain) {
  const start = asAllDay(proposal.due_date);
  const end = asAllDay(addDays(proposal.due_date, 1)); // DTEND is exclusive for all-day events
  const description = [
    proposal.source ? `Source: ${proposal.source}` : '',
    proposal.category ? `Category: ${proposal.category}` : '',
    proposal.relevance_score ? `Priority: ${proposal.relevance_score}` : '',
    proposal.match_reason || '',
  ].filter(Boolean).join('\n');

  const lines = [
    'BEGIN:VEVENT',
    `UID:${proposal.id}@${uidDomain}`,
    `DTSTAMP:${timestamp(new Date())}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeText(`Tender deadline: ${proposal.name}`)}`,
    description ? `DESCRIPTION:${escapeText(description)}` : '',
    proposal.link ? `URL:${proposal.link}` : '',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`Review before deadline: ${proposal.name}`)}`,
    'TRIGGER:-P3D',
    'END:VALARM',
    'END:VEVENT',
  ].filter(Boolean);

  return lines.map(foldLine).join('\r\n');
}

export function buildCalendar(proposals, { calendarName, uidDomain }) {
  const events = proposals
    .filter((proposal) => proposal.due_date && proposal.due_date !== 'Not stated')
    .map((proposal) => buildEvent(proposal, uidDomain));

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ProposalMonitor//Deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n';
}
