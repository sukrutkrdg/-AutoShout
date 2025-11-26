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
  media?: Uint8Array; // Basitleştirildi, URL de olabilir
  scheduledTime: number; // Timestamp (ms)
  status: PostStatus;
  createdAt: number;
  updatedAt: number;
  userId: number; // Farcaster FID (Principal yerine)
}