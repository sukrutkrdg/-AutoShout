// Dosya Yolu: frontend/api/cron.js
import { createClient } from '@supabase/supabase-js';
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});
const neynarClient = new NeynarAPIClient(config);

export default async function handler(req, res) {
  try {
    const now = Date.now();

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_time', now);

    if (error) throw error;

    if (!posts || posts.length === 0) {
      return res.status(200).json({ message: 'No posts to schedule.' });
    }

    const results = [];

    for (const post of posts) {
      try {
        const signerUuid = process.env.NEYNAR_SIGNER_UUID; 

        await neynarClient.publishCast({
          signerUuid: signerUuid,
          text: post.content,
        });

        await supabase
          .from('posts')
          .update({ status: 'published', updated_at: new Date().toISOString() })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'published' });

      } catch (err) {
        console.error(`Post ${post.id} failed:`, err);
        await supabase
          .from('posts')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', post.id);
        results.push({ id: post.id, status: 'failed', error: err.message });
      }
    }

    return res.status(200).json({ success: true, results });

  } catch (error) {
    console.error('Cron Job Error:', error);
    return res.status(500).json({ error: error.message });
  }
}