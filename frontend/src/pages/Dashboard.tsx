import { useState, useEffect } from 'react';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostScheduler from '../components/PostScheduler';
import PostsList from '../components/PostsList';
import CalendarView from '../components/CalendarView';
import ProfileSetupModal from '../components/ProfileSetupModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { data: profile, isLoading } = useGetCallerUserProfile();
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  
  // Modal kontrolü: Profil yoksa VEYA profil var ama Signer yetkisi yoksa aç
  const showSetupModal = !isLoading && (!profile || !profile.signerUuid);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Eğer yetki yoksa Modalı zorla göster */}
      {showSetupModal && <ProfileSetupModal />}

      <Header onOpenScheduler={() => setIsSchedulerOpen(true)} />

      <main className="container mx-auto max-w-2xl p-4">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Gönderiler</TabsTrigger>
            <TabsTrigger value="calendar">Takvim</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-4">
            <PostsList />
          </TabsContent>
          
          <TabsContent value="calendar" className="mt-4">
            <CalendarView />
          </TabsContent>
        </Tabs>
      </main>

      {isSchedulerOpen && (
        <PostScheduler onClose={() => setIsSchedulerOpen(false)} />
      )}
      
      <Footer />
    </div>
  );
}