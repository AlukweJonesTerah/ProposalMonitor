import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const historyFile = path.join(process.cwd(), 'proposal_output', 'previous_opportunities.json');

export async function GET() {
  try {
    return Response.json(JSON.parse(await readFile(historyFile, 'utf8')), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error.code === 'ENOENT') return Response.json({ generated_at: null, count: 0, proposals: [] }, { headers: { 'Cache-Control': 'no-store' } });
    return Response.json({ error: 'Could not read previous opportunities.' }, { status: 500 });
  }
}
