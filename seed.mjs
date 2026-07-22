// One-time seed script: loads the original "verified" contact list into
// Supabase with source='verified'. Safe to re-run — it skips seeding if
// verified rows already exist, so you won't get duplicates.
//
// Usage (env vars come from the Supabase integration):
//   node --env-file-if-exists=/vercel/share/.env.project seed.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contacts = JSON.parse(readFileSync(path.join(__dirname, 'verified-contacts.json'), 'utf8'));

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function main() {
  const { count, error: countError } = await supabase
    .from('lawyer_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'verified');

  if (countError) throw countError;

  if (count > 0) {
    console.log(`Skipping seed — ${count} verified rows already exist.`);
    return;
  }

  const rows = contacts.map((c) => ({
    name: c['Name'] || '',
    phone: c['Phone number'] || '',
    address: c['Address'] || '',
    instagram: c['Instagram Username'] || '',
    emails: c['Emails'] || '',
    source: 'verified',
  }));

  const { error } = await supabase.from('lawyer_contacts').insert(rows);
  if (error) throw error;

  console.log(`Seeded ${rows.length} verified contacts.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
