import { useState } from 'react';
import { useGetCallerUserProfile, useGetUserScheduledPosts } from '../hooks/useQueries';
import PostScheduler from '../components/PostScheduler';
import PostsList from '../components/PostsList';
import CalendarView from '../components/CalendarView';
import ProfileSetupModal from '../components/ProfileSetupModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus } from 'lucide-react';
import { FarcasterUser } from '../lib/farcaster';
import { Button } from '@/components/ui/button';

interface DashboardProps {
    user: FarcasterUser;
}

export default function Dashboard({ user }: DashboardProps) {
  const { data: profile, isLoading: isProfileLoading } = useGetCallerUserProfile();
  const { data: posts, isLoading: isPostsLoading } = useGetUserScheduledPosts(); // Gönderileri çekiyoruz
  
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  
  const showSetupModal = !isProfileLoading && (!profile || !profile.signerUuid);

  if (isProfileLoading || isPostsLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Yetki yoksa Modalı göster */}
      {showSetupModal && <ProfileSetupModal />}

      <main className="container mx-auto max-w-2xl p-4">
        {/* Mobil uyumlu "Yeni Gönderi" butonu (Header App.tsx'te olduğu için buraya ekledik) */}
        <div className="mb-4 flex justify-end">
            <Button onClick={() => setIsSchedulerOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Yeni Planla
            </Button>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Gönderiler</TabsTrigger>
            <TabsTrigger value="calendar">Takvim</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-4">
            {/* Posts prop'unu geçiriyoruz */}
            <PostsList posts={posts || []} />
          </TabsContent>
          
          <TabsContent value="calendar" className="mt-4">
            {/* Posts prop'unu geçiriyoruz */}
            <CalendarView posts={posts || []} />
          </TabsContent>
        </Tabs>
      </main>

      {isSchedulerOpen && (
        <PostScheduler onClose={() => setIsSchedulerOpen(false)} />
      )}
    </div>
  );
}