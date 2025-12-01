import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// --- Ayarları Yükle ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let envPath = path.resolve(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    envPath = path.resolve(__dirname, '../.env');
}

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

console.log("\n🤖 AutoShout Akıllı Bot (Direct API Modu) Başlatılıyor...");

// --- Kontroller ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 
const NEYNAR_KEY = process.env.NEYNAR_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !NEYNAR_KEY) {
    console.error("🚨 EKSİK DEĞİŞKENLER! .env dosyanızı kontrol edin.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const processingCache = new Set();

// Neynar API Endpoint'i
const NEYNAR_API_URL = "https://api.neynar.com/v2/farcaster/cast";

async function checkAndPublish() {
    const now = Date.now();
    const timeString = new Date().toLocaleTimeString('tr-TR');

    try {
        // 1. Bekleyen gönderileri çek
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
            console.log(`\n🚀 [${timeString}] ${posts.length} gönderi işleniyor...`);

            for (const post of posts) {
                if (processingCache.has(post.id)) continue;
                processingCache.add(post.id);

                console.log(`   🔍 İşleniyor: ID ${post.id}`);

                try {
                    // Kullanıcı Signer UUID'sini Al
                    const { data: userProfile, error: profileError } = await supabase
                        .from('profiles')
                        .select('signer_uuid')
                        .eq('fid', post.user_fid)
                        .single();

                    if (profileError || !userProfile?.signer_uuid) {
                        console.error(`   ❌ HATA: Signer anahtarı bulunamadı!`);
                        await supabase.from('posts').update({ status: 'failed' }).eq('id', post.id);
                        processingCache.delete(post.id);
                        continue;
                    }

                    // --- PAYLOAD (VERİ PAKETİ) HAZIRLAMA ---
                    // API'nin istediği tam formatı elle oluşturuyoruz.
                    const payload = {
                        signer_uuid: userProfile.signer_uuid,
                        text: post.content || "", // Boşsa boş string gönder
                    };

                    // Resim varsa embeds dizisine ekle
                    if (post.media_url) {
                        console.log(`   🖼️ Resim bulundu: ${post.media_url}`);
                        payload.embeds = [{ url: post.media_url }];
                    }

                    // --- DOĞRUDAN FETCH İSTEĞİ ---
                    const response = await fetch(NEYNAR_API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'api_key': NEYNAR_KEY
                        },
                        body: JSON.stringify(payload)
                    });

                    const responseData = await response.json();

                    if (!response.ok) {
                        // Hata varsa detayını fırlat
                        throw new Error(`API Hatası (${response.status}): ${JSON.stringify(responseData)}`);
                    }

                    console.log(`   ✅ GÖNDERİLDİ! (Cast Hash: ${responseData.cast?.hash?.substring(0, 10)}...)`);

                    // DB Güncelle
                    await supabase.from('posts').update({ status: 'published' }).eq('id', post.id);
                    processingCache.delete(post.id);

                } catch (err) {
                    console.error(`   ❌ İşlem Başarısız:`, err.message);
                    
                    // DB Güncelle (Failed)
                    await supabase.from('posts').update({ status: 'failed' }).eq('id', post.id);
                    processingCache.delete(post.id);
                }
            }
        }

    } catch (err) {
        console.error(`[${timeString}] Genel Hata:`, err.message);
    }
}

// Döngü
if (!globalThis.fetch) {
    console.error("🚨 UYARI: Node.js sürümünüz 'fetch' desteklemiyor olabilir. Lütfen Node v18 veya üstünü kullanın.");
}
checkAndPublish();
setInterval(checkAndPublish, 60 * 1000);