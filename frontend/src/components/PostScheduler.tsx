import { useState } from 'react';
import { useCreateScheduledPost } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, X } from 'lucide-react';

interface PostSchedulerProps {
  onClose: () => void;
}

export default function PostScheduler({ onClose }: PostSchedulerProps) {
  // Identity hook'unu kaldırdık
  const createPost = useCreateScheduledPost();
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !scheduledDate || !scheduledTime) return;

    const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    // Basit timestamp kullanıyoruz artık, BigInt nano saniye yerine ms
    const scheduledTimeMs = dateTime.getTime();

    // Media blob işlemi şimdilik basitleştirildi veya atlanabilir
    // Backend olmadığı için binary veriyi localstorage'a koymak ağır olabilir
    // Şimdilik media'yı boş geçiyoruz

    createPost.mutate(
      {
        id: `post_${Date.now()}`,
        content: content.trim(),
        scheduledTime: scheduledTimeMs,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: 0, // Hook içinde doldurulacak
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Yeni Gönderi Planla</DialogTitle>
          <DialogDescription>
            Farcaster'da paylaşmak istediğin içeriği ve zamanı ayarla.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">İçerik</Label>
            <Textarea
              id="content"
              placeholder="Ne düşünüyorsun?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{content.length} karakter</p>
          </div>

          <div className="space-y-2">
            <Label>Medya (İsteğe Bağlı)</Label>
            {mediaPreview ? (
              <div className="relative">
                <img src={mediaPreview} alt="Preview" className="h-48 w-full rounded-lg object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={removeMedia}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8">
                <label htmlFor="media" className="cursor-pointer text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Resim veya Video yükle</p>
                  <input
                    id="media"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={minDate}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Saat</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={createPost.isPending}>
              {createPost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Planla
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}