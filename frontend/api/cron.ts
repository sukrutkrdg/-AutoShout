import { createClient } from '@supabase/supabase-js';
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// 1. Supabase ve Neynar Bağlantılarını Kur
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
});
const neynarClient = new NeynarAPIClient(config);

export default async function handler(request: Request) {
  // Sadece yetkili tetiklemelere izin ver (Vercel Cron koruması)
  // Şimdilik test için burayı açık bırakıyoruz.

  try {
    console.log("⏳ Zamanlanmış postlar kontrol ediliyor...");

    // 2. Zamanı gelmiş ve henüz paylaşılmamış ('pending') postları çek
    const now = Date.now();
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_time', now); // scheduled_time <= şu an

    if (error) throw error;

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: 'Paylaşılacak post yok.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`🚀 ${posts.length} adet post bulundu. Paylaşılıyor...`);

    // 3. Bulunan postları tek tek paylaş
    const results = [];
    for (const post of posts) {
      try {
        // Şimdilik herkes için .env'deki "Geliştirici Signer"ını kullanıyoruz.
        // İleride buraya post.user_fid'ye göre kullanıcının kendi signer'ını çekme mantığı eklenecek.
        const signerUuid = process.env.NEYNAR_SIGNER_UUID!;

        // Neynar ile paylaş
        const cast = await neynarClient.publishCast({
          signerUuid: signerUuid,
          text: post.content,
          // Eğer medya varsa embeds: [{ url: post.media_url }] eklenebilir
        });

        // 4. Başarılıysa veritabanını güncelle ('published')
        await supabase
          .from('posts')
          .update({ status: 'published' })
          .eq('id', post.id);

        results.push({ id: post.id, status: 'success', hash: cast.hash });

      } catch (err: any) {
        console.error(`❌ Post ${post.id} hatası:`, err);
        
        // Hata varsa veritabanını güncelle ('failed')
        await supabase
          .from('posts')
          .update({ status: 'failed' }) // Hata mesajını da kaydedebilirsin
          .eq('id', post.id);
          
        results.push({ id: post.id, status: 'failed', error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Genel Hata:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}