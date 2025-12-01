
export type PostStatus = 'pending' | 'published' | 'failed';

export interface UserProfile {
  name: string;
  farcasterHandle: string;
  isPremium: boolean;
  createdAt: number;
}

export interface ScheduledPost {
  id: string;
  content: string;
  mediaUrl?: string; // ARTIK DOSYA DEĞİL, URL SAKLIYORUZ
  scheduledTime: number; 
  status: PostStatus;
  createdAt: number;
  updatedAt: number;
  userId: number;
}