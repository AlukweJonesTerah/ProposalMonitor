import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resultsFile = path.join(process.cwd(), 'proposal_output', 'proposals.json');
const configFile = path.join(process.cwd(), 'Migrations', 'proposal_source.json');

export async function GET() {
  try {
    const [results, config] = await Promise.all([
      readFile(resultsFile, 'utf8').then(JSON.parse),
      readFile(configFile, 'utf8').then(JSON.parse).catch(() => ({})),
    ]);
    return Response.json({ ...results, keywords: config.keywords || [] }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      const config = await readFile(configFile, 'utf8').then(JSON.parse).catch(() => ({}));
      return Response.json({ generated_at: null, count: 0, proposals: [], keywords: config.keywords || [] }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json({ error: 'Could not read the latest proposal results.' }, { status: 500 });
  }
}
