import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ScheduledPost, UserProfile } from '../lib/types';
import sdk from '@farcaster/frame-sdk';
import { supabase } from '../lib/supabase';

// --- YARDIMCI FONKSİYON ---
async function getCurrentFid(): Promise<number> {
    const context = await sdk.context;
    
    // Dev modunda tarayıcıda test ederken hata almamak için sahte ID
    if ((!context || !context.user) && import.meta.env.DEV) return 1; 
    
    if (!context || !context.user) throw new Error("User session not found");
    return context.user.fid;
}

// --- HOOKS ---

export function useGetCallerUserProfile() {
  return useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      const fid = await getCurrentFid();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('fid', fid)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Kayıt yoksa null dön
        console.error(error);
        return null;
      }

      // Veritabanı (snake_case) -> Uygulama (camelCase) Eşleşmesi
      if (data) {
        return {
            name: data.display_name,       // DB: display_name -> App: name
            farcasterHandle: data.username,// DB: username -> App: farcasterHandle
            isPremium: data.is_premium,    // DB: is_premium -> App: isPremium
            createdAt: new Date(data.created_at).getTime(),
            // Eğer signer_uuid varsa onu da dönüyoruz (opsiyonel)
            // Bu alana UserProfile interface'inde ihtiyacın olabilir
            signerUuid: data.signer_uuid 
        } as UserProfile & { signerUuid?: string };
      }
      
      return null;
    },
    retry: false,
  });
}

export function useSaveCallerUserProfile() {
  const queryClient = useQueryClient();

  // Parametre tipi: UserProfile & { signerUuid?: string } olarak genişletildi
  return useMutation({
    mutationFn: async (profile: UserProfile & { signerUuid?: string }) => {
      const fid = await getCurrentFid();
      
      // Yazarken de tam tersi eşleştirme yapıyoruz
      const { error } = await supabase
        .from('profiles')
        .upsert({
            fid: fid,
            username: profile.farcasterHandle, // App -> DB
            display_name: profile.name,        // App -> DB
            is_premium: profile.isPremium,
            // YENİ EKLENEN: Signer UUID varsa kaydet
            ...(profile.signerUuid && { 
                signer_uuid: profile.signerUuid,
                signer_status: 'approved' 
            })
        });
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });
}

export function useGetUserScheduledPosts() {
  return useQuery({
    queryKey: ['userScheduledPosts'],
    queryFn: async () => {
        const fid = await getCurrentFid();
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('user_fid', fid)
          .order('scheduled_time', { ascending: true });

        if (error) throw error;
        
        return (data || []).map((p: any) => ({
            id: p.id,
            content: p.content,
            // Medya varsa url objesi oluştur, yoksa undefined
            media: p.media_url ? { url: p.media_url } : undefined,
            // DB'den bigint (sayı) geliyor, bunu Date objesine veya doğrudan sayıya çeviriyoruz.
            // Eğer DB'de bigint ise p.scheduled_time zaten bir sayı veya string sayı olabilir.
            scheduledTime: Number(p.scheduled_time), 
            status: p.status,
            createdAt: new Date(p.created_at).getTime(),
            updatedAt: Date.now(),
            userId: Number(p.user_fid)
        })) as ScheduledPost[];
    },
  });
}

export function useCreateScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: ScheduledPost) => {
      const fid = await getCurrentFid();
      
      // Profil kontrolü
      const { data: profile } = await supabase.from('profiles').select('fid').eq('fid', fid).single();
      if (!profile) {
          // Eğer profil yoksa varsayılan bir profil oluşturuyoruz.
          // NOT: Bu durumda signer_uuid olmayacağı için bot bu postu atamaz.
          // Kullanıcıyı profil oluşturmaya zorlamak daha iyi bir UX olabilir.
          await supabase.from('profiles').insert({ fid, username: 'user', display_name: 'User' });
      }

      const { error } = await supabase
        .from('posts')
        .insert({
            user_fid: fid,
            content: post.content,
            // DÜZELTME: Veritabanında sütun tipi 'bigint' olduğu için
            // buraya string (ISO) değil, sayısal değer (timestamp) gönderiyoruz.
            scheduled_time: post.scheduledTime, 
            status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userScheduledPosts'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyPostCount'] });
      queryClient.invalidateQueries({ queryKey: ['remainingWeeklyPosts'] });
      toast.success('Cast scheduled successfully');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });
}

export function useDeleteScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userScheduledPosts'] });
      toast.success('Cast deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });
}

export function useGetWeeklyPostCount() {
  return useQuery({
    queryKey: ['weeklyPostCount'],
    queryFn: async () => {
        const fid = await getCurrentFid();
        const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_fid', fid);
        if (error) return 0;
        return count || 0;
    },
  });
}

export function useGetRemainingWeeklyPosts() {
  return useQuery({
    queryKey: ['remainingWeeklyPosts'],
    queryFn: async () => {
        return 100; 
    },
  });
}