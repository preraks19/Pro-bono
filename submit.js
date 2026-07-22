import { sql } from '@vercel/postgres';

// Creates the table on first use. Safe to run on every cold start —
// CREATE TABLE IF NOT EXISTS is a no-op once the table already exists.
async function ensureTable() {
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
}

export default async function handler(req, res) {
  try {
    await ensureTable();

    // ---- GET: return every contact, verified entries first, then newest first ----
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT id, name, phone, address, instagram, emails, source, created_at
        FROM lawyer_contacts
        ORDER BY (source = 'verified') DESC, created_at ASC;
      `;
      return res.status(200).json({ contacts: rows });
    }

    // ---- POST: insert a new community-submitted contact ----
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      const name = String(body.name || '').trim();
      const phone = String(body.phone || '').trim();
      const address = String(body.address || '').trim();
      const instagram = String(body.instagram || '').trim().replace(/^@/, '');
      const emails = String(body.emails || '').trim();

      if (!name) {
        return res.status(400).json({ error: 'Name is required.' });
      }
      // Basic length guards against abuse / accidental huge payloads.
      if (name.length > 200 || phone.length > 100 || address.length > 300 || instagram.length > 100 || emails.length > 300) {
        return res.status(400).json({ error: 'One or more fields exceed the allowed length.' });
      }

      const { rows } = await sql`
        INSERT INTO lawyer_contacts (name, phone, address, instagram, emails, source)
        VALUES (${name}, ${phone}, ${address}, ${instagram}, ${emails}, 'community')
        RETURNING id, name, phone, address, instagram, emails, source, created_at;
      `;
      return res.status(201).json({ contact: rows[0] });
    }

    // No PUT/DELETE handler is implemented on purpose — this API is intentionally
    // append-only. There is no server-side route that can modify or remove an
    // existing row, by design, regardless of what the frontend sends.
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });

  } catch (err) {
    console.error('lawyer_contacts API error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err && err.message ? err.message : err) });
  }
}
