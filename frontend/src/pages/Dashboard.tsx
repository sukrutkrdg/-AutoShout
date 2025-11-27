import { useState } from 'react';
import { useGetCallerUserProfile, useGetUserScheduledPosts, useGetRemainingWeeklyPosts } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, Plus, Zap } from 'lucide-react';
import PostScheduler from '../components/PostScheduler';
import PostsList from '../components/PostsList';
import CalendarView from '../components/CalendarView';
import { FarcasterUser } from '../lib/farcaster';

interface DashboardProps {
  user: FarcasterUser | null;
}

export default function Dashboard({ user }: DashboardProps) {
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: posts = [] } = useGetUserScheduledPosts();
  const { data: remainingPosts } = useGetRemainingWeeklyPosts();
  const [showScheduler, setShowScheduler] = useState(false);

  // DÜZELTME: PostStatus.pending yerine direkt 'pending' kullanıyoruz
  const pendingPosts = posts.filter(p => p.status === 'pending');
  const publishedPosts = posts.filter(p => p.status === 'published');
  const failedPosts = posts.filter(p => p.status === 'failed');

  const weeklyLimit = userProfile?.isPremium ? 100 : 10;
  const usedPosts = weeklyLimit - Number(remainingPosts || BigInt(0));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Planlanmış gönderilerini yönet</p>
          </div>
          <Button onClick={() => setShowScheduler(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Yeni Gönderi Planla
          </Button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPosts.length}</div>
            <p className="text-xs text-muted-foreground">Paylaşılmayı bekliyor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yayınlanan</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedPosts.length}</div>
            <p className="text-xs text-muted-foreground">Başarıyla paylaşıldı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hatalı</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedPosts.length}</div>
            <p className="text-xs text-muted-foreground">Paylaşılamadı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Haftalık Kota</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usedPosts}/{weeklyLimit}</div>
            <p className="text-xs text-muted-foreground">
              {userProfile?.isPremium ? 'Premium' : 'Ücretsiz'} plan
            </p>
          </CardContent>
        </Card>
      </div>

      {!userProfile?.isPremium && (
        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Premium'a Geç
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Haftada 100 gönderi planla, öncelikli destek al ve daha fazlasına eriş.
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="default">Yükselt</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Liste Görünümü</TabsTrigger>
          <TabsTrigger value="calendar">Takvim Görünümü</TabsTrigger>
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