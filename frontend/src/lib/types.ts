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
  mediaUrl?: string; // media yerine mediaUrl kullanıyoruz
  scheduledTime: number; 
  status: PostStatus;
  createdAt: number;
  updatedAt: number;
  userId: number;
}