import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, './.env') });

console.log('--- AEGIS BACKEND DEBUG DIAGNOSTICS ---');
console.log('process.cwd():', process.cwd());
console.log('dotenv path:', path.resolve(__dirname, './.env'));
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Present (length: ' + process.env.SUPABASE_ANON_KEY.length + ')' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'Missing');
console.log('---------------------------------------');

// Test client creation and query
try {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase URL or Service Role Key is missing in env');
  }
  const client = createClient(url, serviceKey);
  console.log('[INFO] Supabase Service Client initialized.');

  // Test queries on tables
  const tables = ['profiles', 'projects', 'events', 'tasks', 'goals', 'notes'];
  for (const table of tables) {
    const { data, error } = await client.from(table).select('*').limit(1);
    if (error) {
      console.error(`[FAIL] Querying table "${table}" failed:`, error.message);
    } else {
      console.log(`[SUCCESS] Table "${table}" exists and is queryable via service role.`);
    }
  }
} catch (err) {
  console.error('[ERROR] Diagnostic test failed:', err.message);
}

