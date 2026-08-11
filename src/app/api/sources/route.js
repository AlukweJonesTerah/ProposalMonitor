import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

const intakeFile = path.join(process.cwd(), 'Migrations', 'pending_source_intake.json');
const configFile = path.join(process.cwd(), 'Migrations', 'proposal_source.json');
const analysisFile = path.join(process.cwd(), 'proposal_output', 'one_off_analysis_links.json');
const resultsFile = path.join(process.cwd(), 'proposal_output', 'proposals.json');

async function readIntake() {
  try { return JSON.parse(await readFile(intakeFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

function isPrivateAddress(address) {
  if (isIP(address) === 4) return /^(10\.|127\.|0\.|169\.254\.|192\.168\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address);
  const normalised = address.toLowerCase();
  return normalised === '::1' || normalised.startsWith('fc') || normalised.startsWith('fd') || normalised.startsWith('fe80');
}

async function safePublicUrl(value) {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(`Enter a public http(s) URL without login details: ${value}`);
  if (['localhost', '127.0.0.1', '::1'].includes(hostname) || hostname.endsWith('.local')) throw new Error(`Private-network URLs cannot be submitted: ${value}`);
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error(`Private-network URLs cannot be submitted: ${value}`);
  return url.href;
}

async function parseUrls(value) {
  const entries = String(value || '').split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
  return [...new Set(await Promise.all(entries.map(safePublicUrl)))];
}

export async function POST(request) {
  try {
    const urls = await parseUrls((await request.json()).urls);
    if (!urls.length) throw new Error('Paste at least one valid URL.');
    const existing = await readIntake();
    const known = new Set(existing.map((item) => item.url));
    const added = urls.filter((url) => !known.has(url)).map((url) => ({ url, submitted_at: new Date().toISOString(), status: 'pending_review' }));
    await mkdir(path.dirname(intakeFile), { recursive: true });
    await writeFile(intakeFile, JSON.stringify([...existing, ...added], null, 2) + '\n');
    return Response.json({ added: added.length, total_pending: existing.length + added.length });
  } catch (error) { return Response.json({ error: error.message || 'Could not save sources.' }, { status: 400 }); }
}

export async function GET() {
  try {
    const [sources, config, analyses, results] = await Promise.all([
      readIntake(),
      readFile(configFile, 'utf8').then(JSON.parse).catch(() => ({ sources: [] })),
      readFile(analysisFile, 'utf8').then(JSON.parse).catch(() => []),
      readFile(resultsFile, 'utf8').then(JSON.parse).catch(() => ({ proposals: [] })),
    ]);
    const discovered = (results.proposals || []).filter((proposal) => proposal.source === 'Public web discovery');
    return Response.json({ sources, recurring: config.sources || [], analysed: analyses, discovered }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return Response.json({ error: 'Could not read submitted sources.' }, { status: 500 }); }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { url, action } = body;
    if (body.operation) {
      const config = JSON.parse(await readFile(configFile, 'utf8'));
      if (body.operation === 'add') {
        const publicUrl = await safePublicUrl(body.url);
        const parsed = new URL(publicUrl);
        if ((config.sources || []).some((source) => source.start_urls?.includes(publicUrl))) throw new Error('This recurring source is already listed.');
        config.sources.push({ name: parsed.hostname.replace(/^www\./, ''), source_type: 'managed_source', start_urls: [publicUrl], allowed_domains: [parsed.hostname.replace(/^www\./, '')], max_links: 40, active: true, check_frequency: 'Every monitor run' });
        await writeFile(configFile, JSON.stringify(config, null, 2) + '\n');
        return Response.json({ message: 'Recurring source added.' });
      }
      if (body.operation === 'update') {
        const publicUrl = await safePublicUrl(body.newUrl);
        const source = (config.sources || []).find((item) => item.start_urls?.includes(body.oldUrl));
        if (!source) throw new Error('Recurring source not found.');
        const parsed = new URL(publicUrl);
        source.name = parsed.hostname.replace(/^www\./, ''); source.start_urls = [publicUrl]; source.allowed_domains = [parsed.hostname.replace(/^www\./, '')];
        await writeFile(configFile, JSON.stringify(config, null, 2) + '\n');
        return Response.json({ message: 'Recurring source updated.' });
      }
      if (body.operation === 'delete') {
        if (body.collection === 'recurring') {
          config.sources = (config.sources || []).filter((source) => !source.start_urls?.includes(body.url));
          await writeFile(configFile, JSON.stringify(config, null, 2) + '\n');
        } else if (body.collection === 'analysed') {
          const analyses = await readFile(analysisFile, 'utf8').then(JSON.parse).catch(() => []);
          await writeFile(analysisFile, JSON.stringify(analyses.filter((item) => item.url !== body.url), null, 2) + '\n');
        } else throw new Error('This link collection cannot be deleted here.');
        return Response.json({ message: 'Link deleted.' });
      }
      throw new Error('Unknown source management action.');
    }
    if (!['approve', 'reject'].includes(action)) throw new Error('Choose approve or reject.');
    const sources = await readIntake();
    const item = sources.find((source) => source.url === url);
    if (!item) throw new Error('Submitted source not found.');
    if (action === 'approve') {
      const publicUrl = await safePublicUrl(url);
      const parsed = new URL(publicUrl);
      const config = JSON.parse(await readFile(configFile, 'utf8'));
      const known = new Set((config.sources || []).flatMap((source) => source.start_urls || []));
      if (!known.has(publicUrl)) {
        config.sources.push({ name: parsed.hostname.replace(/^www\./, ''), source_type: 'approved_submission', start_urls: [publicUrl], allowed_domains: [parsed.hostname.replace(/^www\./, '')], max_links: 40, active: true, check_frequency: 'Every monitor run' });
        await writeFile(configFile, JSON.stringify(config, null, 2) + '\n');
      }
    }
    item.status = action === 'approve' ? 'approved' : 'rejected';
    item.reviewed_at = new Date().toISOString();
    await writeFile(intakeFile, JSON.stringify(sources, null, 2) + '\n');
    return Response.json({ source: item });
  } catch (error) { return Response.json({ error: error.message || 'Could not review this source.' }, { status: 400 }); }
}
