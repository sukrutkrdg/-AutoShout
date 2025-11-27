import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import type { ScheduledPost } from '../lib/types';

interface CalendarViewProps {
  posts: ScheduledPost[];
}

export default function CalendarView({ posts }: CalendarViewProps) {
  const pendingPosts = posts.filter(p => p.status === 'pending');

  const groupedByDate = pendingPosts.reduce((acc, post) => {
    const date = new Date(post.scheduledTime);
    const dateKey = date.toISOString().split('T')[0];
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(post);
    return acc;
  }, {} as Record<string, ScheduledPost[]>);

  const sortedDates = Object.keys(groupedByDate).sort();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    });
  };

  const formatTime = (timeMs: number) => {
    const date = new Date(timeMs);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (pendingPosts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Planlanmış gönderi yok</h3>
          <p className="text-center text-sm text-muted-foreground">
            Takvimde görüntülenecek bekleyen gönderi bulunmuyor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((dateKey) => {
        const datePosts = groupedByDate[dateKey].sort((a, b) => {
          return a.scheduledTime - b.scheduledTime;
        });

        return (
          <div key={dateKey}>
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-lg font-semibold capitalize">{formatDate(dateKey)}</h3>
              <Badge variant="secondary">{datePosts.length} gönderi</Badge>
            </div>
            <div className="space-y-3">
              {datePosts.map((post) => (
                <Card key={post.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatTime(post.scheduledTime)}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}