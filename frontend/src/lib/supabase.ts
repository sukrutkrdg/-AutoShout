import { createClient } from '@supabase/supabase-js';

// Vite projelerinde env değişkenleri import.meta.env üzerinden okunur.
// Değişkenlerin başında VITE_ olooooooooooması şarttır.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Hata ayıklama: Eğer değişkenler yoksa konsola uyarı bas (Geliştirme aşamasında hayat kurtarır)
if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Supabase URL veya Anon Key bulunamadı! .env dosyanızı kontrol edin.");
}

// Supabase istemcisini oluştur
export const supabase = createClient(supabaseUrl, supabaseKey);