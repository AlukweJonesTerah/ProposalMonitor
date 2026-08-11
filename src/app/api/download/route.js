import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
const workbook = path.join(process.cwd(), 'proposal_output', 'proposals.xlsx');

export async function GET() {
  try {
    const file = await readFile(workbook);
    return new Response(file, { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="proposal-monitor-results.xlsx"',
      'Cache-Control': 'no-store',
    } });
  } catch (error) {
    return Response.json({ error: 'No workbook is available yet. Run the monitor first.' }, { status: 404 });
  }
}
