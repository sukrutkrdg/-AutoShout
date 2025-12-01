import { createClient } from '@supabase/supabase-js';
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Ayarları Yükle ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log("\n🤖 AutoShout Akıllı Bot (Çok Kullanıcılı Mod) Başlatılıyor...");

// --- Kontroller ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Yazma yetkisi için Service Role Key şart
const SUPABASE_ADMIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const NEYNAR_KEY = process.env.NEYNAR_API_KEY;

// Not: Artık NEYNAR_SIGNER_UUID'ye ihtiyacımız yok, çünkü veritabanından dinamik çekeceğiz.

if (!SUPABASE_ADMIN_KEY) {
    console.error("🚨 HATA: 'SUPABASE_SERVICE_ROLE_KEY' eksik! (.env dosyasını kontrol et)");
    process.exit(1);
}

// --- Bağlantılar ---
// Service Role Key ile Supabase Client oluştur (RLS bypass)
const supabase = createClient(SUPABASE_URL, SUPABASE_ADMIN_KEY);
const neynarClient = new NeynarAPIClient(new Configuration({ apiKey: NEYNAR_KEY }));
const processingCache = new Set();

async function checkAndPublish() {
    const now = Date.now();
    const timeString = new Date().toLocaleTimeString('tr-TR');

    try {
        // 1. Veritabanından "Zamanı Gelmiş" ve "Pending" olanları çek
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
                // Çifte işlem koruması
                if (processingCache.has(post.id)) continue;
                processingCache.add(post.id);

                console.log(`   🔍 İşleniyor: ID ${post.id} (Kullanıcı FID: ${post.user_fid})`);

                try {
                    // --- ADIM 1: KULLANICININ SIGNER ANAHTARINI BUL ---
                    // Gönderiyi kim planladıysa onun yetki anahtarını çekiyoruz
                    const { data: userProfile, error: profileError } = await supabase
                        .from('profiles')
                        .select('signer_uuid')
                        .eq('fid', post.user_fid)
                        .single();

                    if (profileError || !userProfile || !userProfile.signer_uuid) {
                        console.error(`   ❌ HATA: Kullanıcının (FID: ${post.user_fid}) Signer anahtarı bulunamadı!`);
                        // Anahtarı olmayan gönderiyi failed yap ki sürekli denemesin
                        await supabase.from('posts').update({ status: 'failed' }).eq('id', post.id);
                        processingCache.delete(post.id);
                        continue; // Sonraki gönderiye geç
                    }

                    const userSignerUuid = userProfile.signer_uuid;
                    // -------------------------------------------------

                    let shouldPublish = true;

                    // --- ADIM 2: AKILLI KONTROL (Farcaster'da var mı?) ---
                    try {
                        if (post.user_fid) {
                            // Neynar API ile kullanıcının son gönderilerini kontrol et
                            // Bu adım duplicate (tekrar) gönderimi engellemek için opsiyonel bir güvenlik katmanıdır.
                            const feed = await neynarClient.fetchCastsForUser(post.user_fid, { limit: 10 });
                            
                            const alreadyPosted = feed.casts.some(cast => 
                                cast.text.trim() === post.content.trim()
                            );

                            if (alreadyPosted) {
                                console.log(`   ⚠️ BU GÖNDERİ ZATEN FARCASTER'DA VAR! (Tekrar gönderilmeyecek)`);
                                shouldPublish = false;
                            }
                        }
                    } catch (apiCheckError) {
                        console.warn(`   ⚠️ Farcaster kontrolü yapılamadı, normal gönderim denenecek.`);
                    }

                    // --- ADIM 3: GÖNDERİM (Kullanıcının Anahtarıyla) ---
                    if (shouldPublish) {
                        await neynarClient.publishCast({
                            signerUuid: userSignerUuid, // <--- KULLANICININ ONAYLANMIŞ ANAHTARI
                            text: post.content,
                        });
                        console.log(`   ✅ Cast başarıyla gönderildi.`);
                    }

                    // --- ADIM 4: DURUM GÜNCELLEME ---
                    const { error: updateError } = await supabase
                        .from('posts')
                        .update({ status: 'published' })
                        .eq('id', post.id);

                    if (updateError) {
                        console.error(`   ❌ DB Güncelleme Hatası:`, updateError.message);
                    } else {
                        console.log(`   ✅ Veritabanı 'published' olarak işaretlendi.`);
                        processingCache.delete(post.id);
                    }

                } catch (err) {
                    console.error(`   ❌ İşlem Hatası (ID: ${post.id}):`, err.message);
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