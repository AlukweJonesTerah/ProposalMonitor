import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

const intakeFile = path.join(process.cwd(), 'Migrations', 'pending_source_intake.json');

async function readIntake() {
  try {
    const data = JSON.parse(await readFile(intakeFile, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function parseUrls(value) {
  const candidates = String(value || '').split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
  const urls = [];
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      urls.push(url.href);
    } catch {
      throw new Error(`Invalid URL: ${candidate}`);
    }
  }
  return [...new Set(urls)];
}

export async function POST(request) {
  try {
    const { urls: rawUrls } = await request.json();
    const urls = parseUrls(rawUrls);
    if (!urls.length) return Response.json({ error: 'Paste at least one valid URL.' }, { status: 400 });
    await mkdir(path.dirname(intakeFile), { recursive: true });
    const existing = await readIntake();
    const known = new Set(existing.map((item) => item.url));
    const added = urls.filter((url) => !known.has(url)).map((url) => ({ url, submitted_at: new Date().toISOString(), status: 'pending_review' }));
    await writeFile(intakeFile, JSON.stringify([...existing, ...added], null, 2) + '\n', 'utf8');
    return Response.json({ added: added.length, total_pending: existing.length + added.length });
  } catch (error) {
    return Response.json({ error: error.message || 'Could not save source links.' }, { status: 400 });
  }
}

export async function GET() {
  try {
    const sources = await readIntake();
    return Response.json({ count: sources.length, sources });
  } catch (error) {
    return Response.json({ error: 'Could not read source intake.' }, { status: 500 });
  }
}
