import { createClient } from '@supabase/supabase-js';

// Ortam değişkenlerini al (Vite uyumlu)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Eğer boşsa hata bas (Debug için)
if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Supabase URL veya Key eksik! .env dosyasını kontrol et.");
}

// Supabase istemcisini oluştur ve dışa aktar
export const supabase = createClient(supabaseUrl, supabaseKey);