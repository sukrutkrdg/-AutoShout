import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ScheduledPost, UserProfile, PostStatus } from '../lib/types';
import { initFarcaster } from '../lib/farcaster';

// --- MOCK DATABASE (LocalStorage) ---
// Bu kısım ileride Supabase veya kendi API'n ile değişecek.
const DB_KEYS = {
  POSTS: 'autoshout_posts',
  PROFILE: 'autoshout_profile'
};

const mockDb = {
  getPosts: async (fid: number): Promise<ScheduledPost[]> => {
    // Gerçek API çağrısı simülasyonu (gecikme)
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
    return profiles[fid] || null; // Düzeltilen satır
  },

  saveProfile: async (fid: number, profile: UserProfile) => {
    const profiles = JSON.parse(localStorage.getItem(DB_KEYS.PROFILE) || '{}');
    profiles[fid] = profile;
    localStorage.setItem(DB_KEYS.PROFILE, JSON.stringify(profiles));
  }
};

// --- HOOKS ---

// Mevcut Farcaster kullanıcısının FID'sini almak için yardımcı
async function getCurrentFid(): Promise<number> {
    const user = await initFarcaster();
    if (!user) throw new Error("Kullanıcı oturumu bulunamadı");
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
      toast.success('Profil kaydedildi');
    },
    onError: (error: Error) => {
      toast.error('Hata: ' + error.message);
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
      // FID kontrolü
      const fid = await getCurrentFid();
      post.userId = fid; // Postun sahibini garantiye al
      await mockDb.addPost(post);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userScheduledPosts'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyPostCount'] });
      queryClient.invalidateQueries({ queryKey: ['remainingWeeklyPosts'] });
      toast.success('Post başarıyla planlandı');
    },
    onError: (error: Error) => {
      toast.error('Hata: ' + error.message);
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
      toast.success('Post silindi');
    },
    onError: (error: Error) => {
      toast.error('Silinirken hata oluştu: ' + error.message);
    },
  });
}

export function useGetWeeklyPostCount() {
  return useQuery({
    queryKey: ['weeklyPostCount'],
    queryFn: async () => {
        const fid = await getCurrentFid();
        const posts = await mockDb.getPosts(fid);
        // Basit bir haftalık filtreleme mantığı (Şimdilik tümünü sayıyor)
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
        return BigInt(10 - posts.length); // Örnek limit: 10
    },
  });
}