// Dosya: frontend/local-bot.js
import { createClient } from '@supabase/supabase-js';
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Ayarları Yükle ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log("\n🤖 AutoShout Akıllı Bot (Farcaster Kontrollü) Başlatılıyor...");

// --- Kontroller ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ADMIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const NEYNAR_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;

if (!SUPABASE_ADMIN_KEY) {
    console.error("🚨 HATA: 'SUPABASE_SERVICE_ROLE_KEY' eksik!");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ADMIN_KEY);
const neynarClient = new NeynarAPIClient(new Configuration({ apiKey: NEYNAR_KEY }));
const processingCache = new Set();

async function checkAndPublish() {
    const now = Date.now();
    const timeString = new Date().toLocaleTimeString('tr-TR');

    try {
        // 1. Veritabanından "Zamanı Gelmiş" ve "Pending" olanları çek
        // (Süre sınırı koymadık, çünkü Farcaster'da yoksa eski de olsa atmalıyız)
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_time', now);

        if (error) {
            console.error(`[${timeString}] ❌ DB Okuma Hatası:`, error.message);
            return;
        }

        if (posts && posts.length > 0) {
            console.log(`\n🚀 [${timeString}] ${posts.length} adet işlem bekleyen gönderi var.`);

            for (const post of posts) {
                // Çifte işlem koruması (Script çalışırken)
                if (processingCache.has(post.id)) continue;
                processingCache.add(post.id);

                console.log(`   🔍 Kontrol ediliyor: ID ${post.id}`);

                try {
                    let shouldPublish = true;

                    // --- AKILLI KONTROL BAŞLANGICI ---
                    // Kullanıcının son gönderilerini Neynar'dan çekip kontrol ediyoruz
                    // Böylece "DB güncellenemedi ama cast atıldı" durumunda tekrar atmıyoruz.
                    try {
                        // Kullanıcının son 10 cast'ini getir
                        // Not: user_fid yoksa varsayılan olarak hata vermemesi için try-catch içinde
                        if (post.user_fid) {
                            const feed = await neynarClient.fetchCastsForUser(post.user_fid, { limit: 10 });
                            
                            // İçerik karşılaştırması (Boşlukları temizleyerek)
                            const alreadyPosted = feed.casts.some(cast => 
                                cast.text.trim() === post.content.trim()
                            );

                            if (alreadyPosted) {
                                console.log(`   ⚠️ BU GÖNDERİ ZATEN FARCASTER'DA VAR! (Tekrar gönderilmeyecek)`);
                                shouldPublish = false;
                            }
                        }
                    } catch (apiCheckError) {
                        console.warn(`   ⚠️ Farcaster kontrolü yapılamadı (API Hatası), normal gönderim denenecek.`);
                        // API hatası varsa risk alıp göndermeyi deneyebiliriz veya atlayabiliriz.
                        // Şimdilik devam ediyoruz.
                    }
                    // --- AKILLI KONTROL BİTİŞİ ---


                    if (shouldPublish) {
                        // Gönderilmemişse gönder
                        await neynarClient.publishCast({
                            signerUuid: SIGNER_UUID,
                            text: post.content,
                        });
                        console.log(`   ✅ Cast başarıyla gönderildi.`);
                    }

                    // Veritabanını güncelle (Her iki durumda da: ister yeni atılsın, ister zaten var olsun)
                    const { error: updateError } = await supabase
                        .from('posts')
                        .update({ status: 'published' })
                        .eq('id', post.id);

                    if (updateError) {
                        console.error(`   😱 DB Güncelleme Hatası:`, updateError.message);
                    } else {
                        console.log(`   ✅ Veritabanı 'published' olarak işaretlendi.`);
                        processingCache.delete(post.id);
                    }

                } catch (err) {
                    console.error(`   ❌ Hata (ID: ${post.id}):`, err.message);
                    // Gerçekten bir hata varsa failed yap
                    await supabase.from('posts').update({ status: 'failed' }).eq('id', post.id);
                    processingCache.delete(post.id);
                }
            }
        }

    } catch (err) {
        console.error(`[${timeString}] Genel Hata:`, err.message);
    }
}

// --- DÖNGÜ ---
checkAndPublish();
setInterval(checkAndPublish, 60 * 1000); // Her dakika kontrol et