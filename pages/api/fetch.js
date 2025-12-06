import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Only POST allowed');

  const { password } = req.body;

  // 1. LOCK THE DOOR (Security Check)
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' });
  }

  // 2. GET THE GOODS (Fetch campaigns)
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ data });
}
