import { createCalendarHandler } from '@/lib/calendar-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const { GET } = createCalendarHandler('', 'ProposalMonitor deadlines', 'proposalmonitor');
