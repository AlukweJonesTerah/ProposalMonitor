import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

const intakeFile = path.join(process.cwd(), 'Migrations', 'pending_source_intake.json');

async function readIntake() {
  try { return JSON.parse(await readFile(intakeFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

function parseUrls(value) {
  const urls = String(value || '').split(/[\n,]+/).map((item) => item.trim()).filter(Boolean).map((value) => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Invalid URL: ${value}`);
    return url.href;
  });
  return [...new Set(urls)];
}

export async function POST(request) {
  try {
    const urls = parseUrls((await request.json()).urls);
    if (!urls.length) throw new Error('Paste at least one valid URL.');
    const existing = await readIntake();
    const known = new Set(existing.map((item) => item.url));
    const added = urls.filter((url) => !known.has(url)).map((url) => ({ url, submitted_at: new Date().toISOString(), status: 'pending_review' }));
    await mkdir(path.dirname(intakeFile), { recursive: true });
    await writeFile(intakeFile, JSON.stringify([...existing, ...added], null, 2) + '\n');
    return Response.json({ added: added.length, total_pending: existing.length + added.length });
  } catch (error) { return Response.json({ error: error.message || 'Could not save sources.' }, { status: 400 }); }
}
