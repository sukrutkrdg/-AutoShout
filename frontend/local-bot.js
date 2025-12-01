import { createClient } from '@supabase/supabase-js';
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";
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
} else {
    console.warn("⚠️ .env bulunamadı, sistem değişkenleri kullanılacak.");
}

console.log("\n🤖 AutoShout Akıllı Bot Başlatılıyor...");

// --- Kontroller ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 
const NEYNAR_KEY = process.env.NEYNAR_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !NEYNAR_KEY) {
    console.error("🚨 EKSİK DEĞİŞKENLER! .env dosyanızı kontrol edin.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const neynarClient = new NeynarAPIClient(new Configuration({ apiKey: NEYNAR_KEY }));
const processingCache = new Set();

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
                    // Kullanıcı Anahtarını Al
                    const { data: userProfile, error: profileError } = await supabase
                        .from('profiles')
                        .select('signer_uuid')
                        .eq('fid', post.user_fid)
                        .single();

                    if (profileError || !userProfile?.signer_uuid) {
                        console.error(`   ❌ Signer Yok!`);
                        await supabase.from('posts').update({ status: 'failed' }).eq('id', post.id);
                        processingCache.delete(post.id);
                        continue;
                    }

                    // --- RESİM KONTROLÜ VE DÜZELTME ---
                    const embeds = [];
                    if (post.media_url) {
                        console.log(`   🖼️ Resim bulundu: ${post.media_url}`);
                        embeds.push({ url: post.media_url });
                    }

                    // Cast Seçeneklerini Hazırla
                    // Eğer resim yoksa 'embeds' alanını HİÇ göndermiyoruz.
                    const castOptions = {};
                    if (embeds.length > 0) {
                        castOptions.embeds = embeds;
                    }

                    // Farcaster'a Gönder
                    await neynarClient.publishCast(
                        userProfile.signer_uuid, // 1. Signer UUID
                        post.content,            // 2. Metin
                        castOptions              // 3. Seçenekler (Sadece gerekirse embeds içerir)
                    );

                    console.log(`   ✅ GÖNDERİLDİ!`);

                    // DB Güncelle
                    await supabase.from('posts').update({ status: 'published' }).eq('id', post.id);
                    processingCache.delete(post.id);

                } catch (err) {
                    console.error(`   ❌ Hata:`, err.message || err);
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
checkAndPublish();
setInterval(checkAndPublish, 60 * 1000);