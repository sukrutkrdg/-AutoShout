import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ScheduledPost, UserProfile } from '../lib/types';
import { initFarcaster } from '../lib/farcaster';
import { supabase } from '../lib/supabase';

// --- HELPER ---
async function getCurrentFid(): Promise<number> {
    const user = await initFarcaster();
    // Eğer dev modundaysak ve user yoksa (tarayıcı testi)
    if (!user && import.meta.env.DEV) return 1; 
    if (!user) throw new Error("User session not found");
    return user.fid;
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
      
      if (error && error.code !== 'PGRST116') console.error(error);
      return data as UserProfile | null;
    },
    retry: false,
  });
}

export function useSaveCallerUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile & { fid: number }) => {
      // Profil yoksa oluştur, varsa güncelle (Upsert)
      const { error } = await supabase
        .from('profiles')
        .upsert({
            fid: profile.fid, // Bunu dışarıdan alacağız veya hook içinde belirleyeceğiz
            username: profile.farcasterHandle, // Tip uyumsuzluğu varsa düzeltilmeli
            display_name: profile.name,
            is_premium: profile.isPremium
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
        
        // Veritabanından gelen snake_case'i camelCase'e çevirmemiz gerekebilir
        // veya tipleri ona göre ayarlamalıyız. Şimdilik basit map:
        return (data || []).map((p: any) => ({
            ...p,
            scheduledTime: p.scheduled_time,
            userId: p.user_fid
        })) as ScheduledPost[];
    },
  });
}

export function useCreateScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: ScheduledPost) => {
      const fid = await getCurrentFid();
      
      // Önce profilin var olduğundan emin olalım (Basit çözüm)
      const { data: profile } = await supabase.from('profiles').select('fid').eq('fid', fid).single();
      if (!profile) {
          // Profil yoksa boş bir profil oluştur
          await supabase.from('profiles').insert({ fid, username: 'user' });
      }

      const { error } = await supabase
        .from('posts')
        .insert({
            user_fid: fid,
            content: post.content,
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
      console.error(error);
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
  });
}

// ... Diğer count fonksiyonları da benzer şekilde güncellenebilir
export function useGetRemainingWeeklyPosts() {
    return useQuery({
        queryKey: ['remainingWeeklyPosts'],
        queryFn: async () => BigInt(10) // Şimdilik sabit
    })
}