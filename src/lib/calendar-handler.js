import { readResults } from './tenant';
import { buildCalendar } from './ics';

// Each tenant publishes its own subscribable deadline feed (and single-event
// downloads for one opportunity via ?id=), built from the same live results
// every dashboard already reads - subscribe once in Google Calendar/Outlook/
// Apple Calendar and it stays current as proposals are found or expire.
export function createCalendarHandler(prefix, calendarName, uidDomain) {
  async function GET(request) {
    const { proposals } = await readResults(prefix);
    const id = request.nextUrl.searchParams.get('id');
    const selected = id ? proposals.filter((proposal) => proposal.id === id) : proposals;
    if (id && !selected.length) {
      return Response.json({ error: 'Opportunity not found.' }, { status: 404 });
    }
    const ics = buildCalendar(selected, { calendarName, uidDomain });
    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': id ? `attachment; filename="${id}.ics"` : `inline; filename="${uidDomain}-deadlines.ics"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return { GET };
}
