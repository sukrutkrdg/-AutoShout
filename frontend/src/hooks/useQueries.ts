import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ScheduledPost, UserProfile } from '../lib/types';
import sdk from '@farcaster/frame-sdk';
import { supabase } from '../lib/supabase';

// --- YARDIMCI FONKSİYON ---
async function getCurrentFid(): Promise<number> {
    const context = await sdk.context;
    
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
        if (error.code === 'PGRST116') return null; 
        console.error(error);
        return null;
      }

      if (data) {
        return {
            name: data.display_name,       
            farcasterHandle: data.username,
            isPremium: data.is_premium,    
            createdAt: new Date(data.created_at).getTime(),
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

  return useMutation({
    mutationFn: async (profile: UserProfile & { signerUuid?: string }) => {
      const fid = await getCurrentFid();
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
            fid: fid,
            username: profile.farcasterHandle, 
            display_name: profile.name,        
            is_premium: profile.isPremium,
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

export function useDisconnectUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const fid = await getCurrentFid();
      const { error } = await supabase
        .from('profiles')
        .update({ signer_uuid: null, signer_status: null })
        .eq('fid', fid);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Disconnected successfully');
    },
    onError: (error: Error) => {
      console.error('Logout error:', error);
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
            mediaUrl: p.media_url || undefined, // DÜZELTİLDİ: media -> mediaUrl
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
            media_url: post.mediaUrl, // DÜZELTİLDİ: mediaUrl veritabanına gidiyor
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

function getStartOfCurrentWeek(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday ... 6=Saturday
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - daysFromMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek.toISOString();
}

export function useGetWeeklyPostCount() {
  return useQuery({
    queryKey: ['weeklyPostCount'],
    queryFn: async () => {
        const fid = await getCurrentFid();
        const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_fid', fid)
            .gte('created_at', getStartOfCurrentWeek());
        if (error) return 0;
        return count || 0;
    },
  });
}

export function useGetRemainingWeeklyPosts() {
  return useQuery({
    queryKey: ['remainingWeeklyPosts'],
    queryFn: async () => {
      const fid = await getCurrentFid();

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('fid', fid)
        .single();

      const limit = profile?.is_premium ? 100 : 10;

      const { count, error } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_fid', fid)
        .gte('created_at', getStartOfCurrentWeek());

      if (error) return limit;
      return Math.max(0, limit - (count || 0));
    },
  });
}