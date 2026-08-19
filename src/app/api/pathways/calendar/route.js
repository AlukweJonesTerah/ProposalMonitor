import { createCalendarHandler } from '@/lib/calendar-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const { GET } = createCalendarHandler('pathways_', 'Pathways Technologies deadlines', 'pathways.proposalmonitor');
