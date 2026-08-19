import { createAnalyseHandler } from '@/lib/analyse-handler';

export const runtime = 'nodejs';

export const { POST } = createAnalyseHandler('pathways_');
