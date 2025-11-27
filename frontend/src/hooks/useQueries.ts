import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ScheduledPost, UserProfile } from '../lib/types';
import { initFarcaster } from '../lib/farcaster';
import { supabase } from '../lib/supabase';

// --- YARDIMCI FONKSİYON ---
async function getCurrentFid(): Promise<number> {
    const user = await initFarcaster();
    // Dev modunda tarayıcıda test ederken hata almamak için sahte ID
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
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Kayıt yoksa null dön
        console.error(error);
        return null;
      }

      // 🔥 KRİTİK DÜZELTME BURADA 🔥
      // Veritabanından gelen veriyi (snake_case), uygulamanın beklediği tipe (camelCase) çeviriyoruz.
      if (data) {
        return {
            name: data.display_name,       // DB: display_name -> App: name
            farcasterHandle: data.username,// DB: username -> App: farcasterHandle
            isPremium: data.is_premium,    // DB: is_premium -> App: isPremium
            createdAt: new Date(data.created_at).getTime()
        } as UserProfile;
      }
      
      return null;
    },
    retry: false,
  });
}

export function useSaveCallerUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      const fid = await getCurrentFid();
      
      // Veritabanına yazarken de tam tersini yapıyoruz
      const { error } = await supabase
        .from('profiles')
        .upsert({
            fid: fid,
            username: profile.farcasterHandle, // App -> DB
            display_name: profile.name,        // App -> DB
            is_premium: profile.isPremium,
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
        
        // Postlar için de eşleştirme yapıyoruz
        return (data || []).map((p: any) => ({
            id: p.id,
            content: p.content,
            scheduledTime: Number(p.scheduled_time), // BigInt çökmesini engellemek için Number
            status: p.status,
            createdAt: new Date(p.created_at).getTime(),
            updatedAt: Date.now(), // DB'de update sütunu yoksa şimdiki zamanı ver
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
      
      // Profil kontrolü: Eğer profil yoksa oluştur (Yabancı anahtar hatasını önler)
      const { data: profile } = await supabase.from('profiles').select('fid').eq('fid', fid).single();
      if (!profile) {
          await supabase.from('profiles').insert({ fid, username: 'user', display_name: 'User' });
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