import { useState } from 'react';
import { useDeleteScheduledPost } from '../hooks/useQueries';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Clock, CheckCircle2, XCircle, Trash2, Image } from 'lucide-react';
import type { ScheduledPost, PostStatus } from '../lib/types';

interface PostsListProps {
  posts: ScheduledPost[];
}

export default function PostsList({ posts }: PostsListProps) {
  const deletePost = useDeleteScheduledPost();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortedPosts = [...posts].sort((a, b) => {
    const aTime = Number(a.scheduledTime);
    const bTime = Number(b.scheduledTime);
    return bTime - aTime;
  });

  const formatDate = (timeMs: number) => {
    const date = new Date(timeMs);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Bekliyor
          </Badge>
        );
      case 'published':
        return (
          <Badge variant="outline" className="gap-1 border-green-500/50 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Yayınlandı
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Hatalı
          </Badge>
        );
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deletePost.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Henüz planlanmış gönderi yok</h3>
          <p className="text-center text-sm text-muted-foreground">
            İlk gönderini oluşturmak için "Yeni Gönderi Planla" butonuna tıkla.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {sortedPosts.map((post) => (
          <Card key={post.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  {getStatusBadge(post.status)}
                  <span className="text-sm text-muted-foreground">
                    {formatDate(post.scheduledTime)}
                  </span>
                </div>
              </div>
              {post.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(post.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{post.content}</p>
              {post.media && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Image className="h-4 w-4" />
                  <span>Medya eklendi</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gönderiyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu gönderiyi silmek istediğine emin misin? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}