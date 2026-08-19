import { readWorkbook } from '@/lib/tenant';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const file = await readWorkbook('pathways_');
    return new Response(file, { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="pathways-technologies-results.xlsx"',
      'Cache-Control': 'no-store',
    } });
  } catch {
    return Response.json({ error: 'No workbook is available yet. Run the monitor first.' }, { status: 404 });
  }
}
