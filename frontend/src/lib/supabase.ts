import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Güvenlik Kontrolü: Eğer anahtarlar yoksa, uygulamayı çökertmek yerine
// geçersiz bir istemci oluşturuyoruz. Bu sayede arayüz açılır ama veri gelmez.
export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://placeholder.supabase.co', 'placeholder_key');

if (!supabaseUrl || !supabaseKey) {
  console.error("🚨 KRİTİK HATA: Supabase URL veya Key bulunamadı! Vercel Environment Variables ayarlarını kontrol edin.");
}