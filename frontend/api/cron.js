// frontend/api/cron.js
import { createClient } from '@supabase/supabase-js';
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// Supabase Kurulumu (Backend tarafında process.env kullanılır)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Veya Service Role Key daha iyi olur
const supabase = createClient(supabaseUrl, supabaseKey);

// Neynar (Farcaster) Kurulumu
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
});
const neynarClient = new NeynarAPIClient(config);

export default async function handler(req, res) {
  // Sadece yetkili servislerin çağırması için basit bir güvenlik önlemi (Opsiyonel ama önerilir)
  // Vercel Cron bu header'ı otomatik ekler.
  const authHeader = req.headers['authorization'];
  if (req.query.key !== process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Test ederken tarayıcıdan ?key=SENIN_GIZLI_SIFREN ile tetikleyebilirsin
    // return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = Date.now(); // Şu anki UTC zaman damgası

    // 1. Bekleyen ve saati gelmiş/geçmiş gönderileri çek
    // scheduled_time <= now
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_time', now);

    if (error) throw error;

    if (!posts || posts.length === 0) {
      return res.status(200).json({ message: 'Paylaşılacak gönderi yok.' });
    }

    const results = [];

    // 2. Her gönderiyi sırayla paylaş
    for (const post of posts) {
      try {
        // Gönderi sahibinin profilinden veya env'den Signer UUID bulman gerekebilir.
        // Şimdilik sistemin genel bir botu olduğunu varsayarak env'den alıyoruz.
        // Eğer kullanıcı adına paylaşım yapacaksan veritabanında kullanıcının signer_uuid'sini de tutman gerekir.
        const signerUuid = process.env.NEYNAR_SIGNER_UUID; 

        const publishResult = await neynarClient.publishCast({
          signerUuid: signerUuid,
          text: post.content,
          // Eğer medya varsa embeds ekle (API dökümantasyonuna göre düzenlenmeli)
          // embeds: post.media_url ? [{ url: post.media_url }] : undefined
        });

        // 3. Başarılıysa durumu güncelle
        await supabase
          .from('posts')
          .update({ 
            status: 'published', 
            updated_at: new Date().toISOString(),
            // hash: publishResult.hash // İstersen hash'i de kaydedebilirsin (DB şemasında varsa)
          })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'published' });

      } catch (err) {
        console.error(`Post ${post.id} failed:`, err);
        
        // Başarısızsa durumu güncelle
        await supabase
          .from('posts')
          .update({ 
            status: 'failed', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', post.id);
          
        results.push({ id: post.id, status: 'failed', error: err.message });
      }
    }

    return res.status(200).json({ success: true, results });

  } catch (error) {
    console.error('Cron Job Hatası:', error);
    return res.status(500).json({ error: error.message });
  }
}