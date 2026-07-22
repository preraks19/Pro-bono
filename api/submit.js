import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client using the service role key. This key bypasses
// Row Level Security, so it must ONLY ever be used here in the serverless
// function — never exposed to the browser.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const COLUMNS = 'id, name, phone, address, instagram, emails, source, created_at';

export default async function handler(req, res) {
  try {
    // ---- GET: return every contact, verified entries first, then oldest first ----
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('lawyer_contacts')
        .select(COLUMNS)
        .order('source', { ascending: false }) // 'verified' > 'community' alphabetically
        .order('created_at', { ascending: true });

      if (error) throw error;
      return res.status(200).json({ contacts: data || [] });
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

      const { data, error } = await supabase
        .from('lawyer_contacts')
        .insert({ name, phone, address, instagram, emails, source: 'community' })
        .select(COLUMNS)
        .single();

      if (error) throw error;
      return res.status(201).json({ contact: data });
    }

    // No PUT/DELETE handler is implemented on purpose — this API is intentionally
    // append-only. There is no server-side route that can modify or remove an
    // existing row, by design, regardless of what the frontend sends.
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });

  } catch (err) {
    console.error('[v0] lawyer_contacts API error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err && err.message ? err.message : err) });
  }
}
