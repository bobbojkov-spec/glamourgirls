import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing env var ${name}. Set it in .env.local (see Supabase dashboard → Project Settings → API).`
    );
  }
  return value;
}

export function createSupabaseClient(): SupabaseClient {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

// Convenience singleton for client-side usage
export const supabase = createSupabaseClient();


