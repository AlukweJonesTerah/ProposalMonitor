export function GET() {
  return Response.json({
    status: 'ok',
    service: 'proposal-monitor-web',
    timestamp: new Date().toISOString(),
    supabase_browser_configured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  });
}
