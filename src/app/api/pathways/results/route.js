import { readResults } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await readResults('pathways_'), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Could not read the latest proposal results.' }, { status: 500 });
  }
}
