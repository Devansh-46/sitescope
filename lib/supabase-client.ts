// lib/supabase.ts
// Lazy Supabase client — initialized on first use, not at module load time.
// This prevents crashes during Next.js startup if env vars load slightly late.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars. Add to .env:\n' +
      'SUPABASE_URL=https://xxx.supabase.co\n' +
      'SUPABASE_SERVICE_ROLE_KEY=eyJ...'
    );
  }

  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

// Convenience export — same API as before
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

export type ReportStatus = 'PENDING' | 'SCRAPING' | 'ANALYZING' | 'COMPLETE' | 'FAILED';
