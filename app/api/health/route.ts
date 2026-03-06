// app/api/health/route.ts
// GET /api/health — checks env vars, DB connection, and Gemini AI connectivity
// Visit https://your-domain/api/health to diagnose issues

import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Check env vars
  checks.SUPABASE_URL = process.env.SUPABASE_URL ? '✅ set' : '❌ MISSING';
  checks.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ set' : '❌ MISSING';
  checks.GEMINI_API_KEY = process.env.GEMINI_API_KEY ? '✅ set' : '❌ MISSING';

  // 2. Test DB connection
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('reports').select('id').limit(1);
    checks.database = error ? `❌ ${error.message}` : '✅ connected';
  } catch (e) {
    checks.database = `❌ ${e instanceof Error ? e.message : 'unknown error'}`;
  }

  // 3. Test Gemini AI connectivity with a minimal prompt
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const result = await Promise.race([
        model.generateContent('Reply with just the word: OK'),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout after 10s')), 10_000)
        ),
      ]);

      const text = result.response.text().trim();
      checks.gemini_ai = text ? `✅ connected (response: "${text.slice(0, 30)}")` : '⚠️ connected but empty response';
    } catch (e) {
      checks.gemini_ai = `❌ ${e instanceof Error ? e.message : 'unknown error'}`;
    }
  } else {
    checks.gemini_ai = '❌ skipped (no API key)';
  }

  // 4. Check recent stuck reports (PENDING/SCRAPING/ANALYZING for more than 5 minutes)
  try {
    const { supabase } = await import('@/lib/supabase');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: stuckReports, error } = await supabase
      .from('reports')
      .select('id, status, created_at')
      .in('status', ['PENDING', 'SCRAPING', 'ANALYZING'])
      .lt('created_at', fiveMinutesAgo)
      .limit(5);

    if (error) {
      checks.stuck_reports = `❌ query failed: ${error.message}`;
    } else if (stuckReports && stuckReports.length > 0) {
      checks.stuck_reports = `⚠️ ${stuckReports.length} stuck report(s) found: ${stuckReports.map(r => `${r.id.slice(0, 8)}(${r.status})`).join(', ')}`;
    } else {
      checks.stuck_reports = '✅ none';
    }
  } catch (e) {
    checks.stuck_reports = `❌ ${e instanceof Error ? e.message : 'unknown'}`;
  }

  const allGood = Object.values(checks).every(v => v.startsWith('✅'));

  return NextResponse.json({
    status: allGood ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: allGood ? 200 : 500 });
}
