// One-time seed script: loads the original "verified" contact list into
// Postgres with source='verified'. Safe to re-run — it skips seeding if
// verified rows already exist, so you won't get duplicates.
//
// Usage:
//   1. vercel env pull .env.development.local   (pulls POSTGRES_* env vars)
//   2. npm install
//   3. npm run seed

import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contacts = JSON.parse(readFileSync(path.join(__dirname, 'verified-contacts.json'), 'utf8'));

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS lawyer_contacts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      instagram TEXT NOT NULL DEFAULT '',
      emails TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'community',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  const existing = await sql`SELECT COUNT(*)::int AS count FROM lawyer_contacts WHERE source = 'verified';`;
  if (existing.rows[0].count > 0) {
    console.log(`Skipping seed — ${existing.rows[0].count} verified rows already exist.`);
    return;
  }

  let inserted = 0;
  for (const c of contacts) {
    await sql`
      INSERT INTO lawyer_contacts (name, phone, address, instagram, emails, source)
      VALUES (
        ${c['Name'] || ''},
        ${c['Phone number'] || ''},
        ${c['Address'] || ''},
        ${c['Instagram Username'] || ''},
        ${c['Emails'] || ''},
        'verified'
      );
    `;
    inserted += 1;
  }
  console.log(`Seeded ${inserted} verified contacts.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
