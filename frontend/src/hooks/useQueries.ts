import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ScheduledPost, UserProfile } from '../lib/types';
import { initFarcaster } from '../lib/farcaster';
import { supabase } from '../lib/supabase';

// --- HELPER ---
async function getCurrentFid(): Promise<number> {
    const user = await initFarcaster();
    // Dev modunda test için
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
        // Profil bulunamazsa null dön, hata patlatma
        if (error.code === 'PGRST116') return null;
        console.error(error);
        return null;
      }

      // DÜZELTME BURADA: Veritabanından gelen 'display_name'i 'name'e çeviriyoruz
      if (data) {
        return {
            name: data.display_name, // display_name -> name
            farcasterHandle: data.username, // username -> farcasterHandle
            isPremium: data.is_premium, // is_premium -> isPremium
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
      const { error } = await supabase
        .from('profiles')
        .upsert({
            fid: fid,
            username: profile.farcasterHandle,
            display_name: profile.name, // Frontend'den gelen name'i display_name'e yaz
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
        
        // Post verilerini de eşleştiriyoruz
        return (data || []).map((p: any) => ({
            id: p.id,
            content: p.content,
            media: p.media_url ? { url: p.media_url } : undefined,
            scheduledTime: Number(p.scheduled_time), // BigInt -> Number
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
      
      // Profil kontrolü (Yoksa oluştur)
      const { data: profile } = await supabase.from('profiles').select('fid').eq('fid', fid).single();
      if (!profile) {
          // Farcaster context'ten gelen ismi kullanabiliriz ama şimdilik basit tutuyoruz
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

// Not: BigInt sorunu yaşamamak için sayıları Number'a çevirerek dönüyoruz
export function useGetWeeklyPostCount() {
  return useQuery({
    queryKey: ['weeklyPostCount'],
    queryFn: async () => {
        const fid = await getCurrentFid();
        const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_fid', fid);
        if (error) return 0; // BigInt yerine number
        return count || 0;
    },
  });
}

export function useGetRemainingWeeklyPosts() {
  return useQuery({
    queryKey: ['remainingWeeklyPosts'],
    queryFn: async () => {
        return 100; // BigInt yerine number
    },
  });
}