export function GET() { return Response.json({ status: 'ok', service: 'proposal-monitor-web', timestamp: new Date().toISOString() }); }
