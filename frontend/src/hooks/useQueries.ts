import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ScheduledPost, UserProfile, PostStatus } from '../lib/types';
import { initFarcaster } from '../lib/farcaster';

const DB_KEYS = {
  POSTS: 'autoshout_posts',
  PROFILE: 'autoshout_profile'
};

const mockDb = {
  getPosts: async (fid: number): Promise<ScheduledPost[]> => {
    await new Promise(r => setTimeout(r, 500));
    const allPosts = JSON.parse(localStorage.getItem(DB_KEYS.POSTS) || '[]');
    return allPosts.filter((p: any) => p.userId === fid);
  },
  
  addPost: async (post: ScheduledPost) => {
    await new Promise(r => setTimeout(r, 500));
    const posts = JSON.parse(localStorage.getItem(DB_KEYS.POSTS) || '[]');
    posts.push(post);
    localStorage.setItem(DB_KEYS.POSTS, JSON.stringify(posts));
  },

  deletePost: async (id: string) => {
    await new Promise(r => setTimeout(r, 500));
    let posts = JSON.parse(localStorage.getItem(DB_KEYS.POSTS) || '[]');
    posts = posts.filter((p: any) => p.id !== id);
    localStorage.setItem(DB_KEYS.POSTS, JSON.stringify(posts));
  },

  getProfile: async (fid: number): Promise<UserProfile | null> => {
    const profiles = JSON.parse(localStorage.getItem(DB_KEYS.PROFILE) || '{}');
    return profiles[fid] || null;
  },

  saveProfile: async (fid: number, profile: UserProfile) => {
    const profiles = JSON.parse(localStorage.getItem(DB_KEYS.PROFILE) || '{}');
    profiles[fid] = profile;
    localStorage.setItem(DB_KEYS.PROFILE, JSON.stringify(profiles));
  }
};

async function getCurrentFid(): Promise<number> {
    const user = await initFarcaster();
    if (!user) throw new Error("User session not found");
    return user.fid;
}

export function useGetCallerUserProfile() {
  return useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      const fid = await getCurrentFid();
      return mockDb.getProfile(fid);
    },
    retry: false,
  });
}

export function useSaveCallerUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      const fid = await getCurrentFid();
      await mockDb.saveProfile(fid, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
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
        try {
            const fid = await getCurrentFid();
            return mockDb.getPosts(fid);
        } catch (e) {
            return [];
        }
    },
  });
}

export function useCreateScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: ScheduledPost) => {
      const fid = await getCurrentFid();
      post.userId = fid; 
      await mockDb.addPost(post);
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
      await mockDb.deletePost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userScheduledPosts'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyPostCount'] });
      queryClient.invalidateQueries({ queryKey: ['remainingWeeklyPosts'] });
      toast.success('Cast deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete cast: ' + error.message);
    },
  });
}

export function useGetWeeklyPostCount() {
  return useQuery({
    queryKey: ['weeklyPostCount'],
    queryFn: async () => {
        const fid = await getCurrentFid();
        const posts = await mockDb.getPosts(fid);
        return BigInt(posts.length); 
    },
  });
}

export function useGetRemainingWeeklyPosts() {
  return useQuery({
    queryKey: ['remainingWeeklyPosts'],
    queryFn: async () => {
        const fid = await getCurrentFid();
        const posts = await mockDb.getPosts(fid);
        return BigInt(10 - posts.length); 
    },
  });
}