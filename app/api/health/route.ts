// app/api/health/route.ts
// GET /api/health — checks env vars and DB connection
// Visit http://localhost:3000/api/health to diagnose issues

import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars
  checks.SUPABASE_URL = process.env.SUPABASE_URL ? '✅ set' : '❌ MISSING';
  checks.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ set' : '❌ MISSING';
  checks.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ? '✅ set' : '❌ MISSING';

  // Test DB connection
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('reports').select('id').limit(1);
    checks.database = error ? `❌ ${error.message}` : '✅ connected';
  } catch (e) {
    checks.database = `❌ ${e instanceof Error ? e.message : 'unknown error'}`;
  }

  const allGood = Object.values(checks).every(v => v.startsWith('✅'));

  return NextResponse.json({
    status: allGood ? 'ok' : 'error',
    checks,
  }, { status: allGood ? 200 : 500 });
}
