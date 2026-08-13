import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resultsFile = path.join(process.cwd(), 'proposal_output', 'proposals.json');
const configFile = path.join(process.cwd(), 'proposal_output', 'proposal_source.json');
const configTemplateFile = path.join(process.cwd(), 'Migrations', 'proposal_source.json');

async function readConfig() {
  return readFile(configFile, 'utf8').then(JSON.parse)
    .catch(() => readFile(configTemplateFile, 'utf8').then(JSON.parse).catch(() => ({})));
}

function nairobiDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function isActiveProposal(proposal, today) {
  const dueDate = proposal?.due_date;
  return !/^\d{4}-\d{2}-\d{2}$/.test(dueDate || '') || dueDate >= today;
}

export async function GET() {
  try {
    const [results, config] = await Promise.all([
      readFile(resultsFile, 'utf8').then(JSON.parse),
      readConfig(),
    ]);
    const proposals = (results.proposals || []).filter((proposal) => isActiveProposal(proposal, nairobiDate()));
    return Response.json({ ...results, count: proposals.length, proposals, keywords: config.keywords || [] }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      const config = await readConfig();
      return Response.json({ generated_at: null, count: 0, proposals: [], keywords: config.keywords || [] }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json({ error: 'Could not read the latest proposal results.' }, { status: 500 });
  }
}
