import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

import { tenantPaths } from './tenant';
import { assertPublicUrl } from './safe-url';

async function ensureEditableFile(file, template, fallback) {
  try { return await readFile(file, 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(path.dirname(file), { recursive: true });
    const initial = await readFile(template, 'utf8').catch(() => fallback);
    try { await writeFile(file, initial, { flag: 'wx' }); }
    catch (writeError) { if (writeError.code !== 'EEXIST') throw writeError; }
    return readFile(file, 'utf8');
  }
}

async function safePublicUrl(value) {
  return (await assertPublicUrl(value, 'submitted')).href;
}

async function parseUrls(value) {
  const entries = String(value || '').split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
  return [...new Set(await Promise.all(entries.map(safePublicUrl)))];
}

// Each tenant (ProposalMonitor's default "" prefix, "pathways_" for Pathways
// Technologies) manages its own source register and intake queue against its
// own files, but the read/validate/edit logic is identical, so it lives here
// once and each route module just binds it to a prefix.
export function createSourceHandlers(prefix = '') {
  const { config: configFile, configTemplate: configTemplateFile, intake: intakeFile, intakeTemplate: intakeTemplateFile, analysis: analysisFile, results: resultsFile } = tenantPaths(prefix);

  async function readConfig() {
    return JSON.parse(await ensureEditableFile(configFile, configTemplateFile, '{"sources": []}\n'));
  }

  async function readIntake() {
    return JSON.parse(await ensureEditableFile(intakeFile, intakeTemplateFile, '[]\n'));
  }

  async function POST(request) {
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

  async function GET() {
    try {
      const [sources, config, analyses, results] = await Promise.all([
        readIntake(),
        readConfig(),
        readFile(analysisFile, 'utf8').then(JSON.parse).catch(() => []),
        readFile(resultsFile, 'utf8').then(JSON.parse).catch(() => ({ proposals: [] })),
      ]);
      const discovered = (results.proposals || []).filter((proposal) => proposal.source === 'Public web discovery');
      return Response.json({ sources, recurring: config.sources || [], analysed: analyses, discovered }, { headers: { 'Cache-Control': 'no-store' } });
    } catch { return Response.json({ error: 'Could not read submitted sources.' }, { status: 500 }); }
  }

  async function PATCH(request) {
    try {
      const body = await request.json();
      const { url, action } = body;
      if (body.operation) {
        const config = await readConfig();
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
        const config = await readConfig();
        const known = new Set((config.sources || []).flatMap((source) => source.start_urls || []));
        if (!known.has(publicUrl)) {
          config.sources.push({ name: parsed.hostname.replace(/^www\./, ''), source_type: 'approved_submission', start_urls: [publicUrl], allowed_domains: [parsed.hostname.replace(/^www\./, '')], max_links: 40, active: true, check_frequency: 'Every monitor run' });
          await writeFile(configFile, JSON.stringify(config, null, 2) + '\n');
        }
      }
      item.status = action === 'approve' ? 'approved' : 'rejected';
      item.reviewed_at = new Date().toISOString();
      await writeFile(intakeFile, JSON.stringify(sources, null, 2) + '\n');
      return Response.json({ source: item, message: action === 'approve' ? 'Source approved and added to recurring monitoring.' : 'Source rejected.' });
    } catch (error) { return Response.json({ error: error.message || 'Could not review this source.' }, { status: 400 }); }
  }

  return { GET, POST, PATCH };
}
