import { useState } from 'react';
import { useGetCallerUserProfile, useGetUserScheduledPosts, useGetRemainingWeeklyPosts } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, Plus, Zap } from 'lucide-react';
import PostScheduler from '../components/PostScheduler';
import PostsList from '../components/PostsList';
import CalendarView from '../components/CalendarView';
import ProfileSetupModal from '../components/ProfileSetupModal'; // EKLENDİ: Giriş ekranı bileşeni
import { FarcasterUser } from '../lib/farcaster';

interface DashboardProps {
  user: FarcasterUser | null;
}

export default function Dashboard({ user }: DashboardProps) {
  // EKLENDİ: isLoading durumunu da çekiyoruz ki sayfa yüklenirken modal aniden açılmasın
  const { data: userProfile, isLoading: isProfileLoading } = useGetCallerUserProfile();
  const { data: posts = [] } = useGetUserScheduledPosts();
  const { data: remainingPosts } = useGetRemainingWeeklyPosts();
  const [showScheduler, setShowScheduler] = useState(false);

  // --- EKLENDİ: Giriş Kontrol Mantığı ---
  // Profil yüklenmişse VE (profil yoksa VEYA signer_uuid yoksa) -> Giriş ekranını aç
  const showSetupModal = !isProfileLoading && (!userProfile || !userProfile.signerUuid);

  const pendingPosts = posts.filter(p => p.status === 'pending');
  const publishedPosts = posts.filter(p => p.status === 'published');
  const failedPosts = posts.filter(p => p.status === 'failed');

  const weeklyLimit = userProfile?.isPremium ? 100 : 10;
  const usedPosts = weeklyLimit - Number(remainingPosts || 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      
      {/* EKLENDİ: Giriş yapılmamışsa modalı göster */}
      {showSetupModal && <ProfileSetupModal user={user} />}

      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Manage your scheduled casts</p>
          </div>
          <Button onClick={() => setShowScheduler(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Schedule New Cast
          </Button>
        </div>
      </div>

      {/* İSTATİSTİK KARTLARI (Tasarım Aynen Korundu) */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPosts.length}</div>
            <p className="text-xs text-muted-foreground">Waiting to be published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedPosts.length}</div>
            <p className="text-xs text-muted-foreground">Successfully published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedPosts.length}</div>
            <p className="text-xs text-muted-foreground">Could not be published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Quota</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usedPosts}/{weeklyLimit}</div>
            <p className="text-xs text-muted-foreground">
              {userProfile?.isPremium ? 'Premium' : 'Free'} plan
            </p>
          </CardContent>
        </Card>
      </div>

      {!userProfile?.isPremium && (
        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Upgrade to Premium
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Schedule 100 casts per week, get priority support, and access more features.
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="default">Upgrade</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <PostsList posts={posts} />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <CalendarView posts={posts} />
        </TabsContent>
      </Tabs>

      {showScheduler && <PostScheduler onClose={() => setShowScheduler(false)} />}
    </div>
  );
}