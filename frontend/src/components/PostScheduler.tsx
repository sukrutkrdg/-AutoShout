import { useState } from 'react';
import { useCreateScheduledPost } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface PostSchedulerProps {
  onClose: () => void;
}

export default function PostScheduler({ onClose }: PostSchedulerProps) {
  const createPost = useCreateScheduledPost();
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // Resim Yönetimi için State'ler
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 1. Resmi Seçince Ön İzlemeyi Oluşturan Fonksiyon
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB Limit
          toast.error("File size too large (max 5MB)");
          return;
      }
      setMediaFile(file);
      
      // Ön izleme (Preview) oluşturma mantığı
      const objectUrl = URL.createObjectURL(file);
      setMediaPreview(objectUrl);
    }
  };

  // 2. Resmi Kaldırma Fonksiyonu
  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  // 3. Gönderme (Upload + Database Kayıt) Fonksiyonu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile) {
        toast.error("Please enter text or add an image.");
        return;
    }
    if (!scheduledDate || !scheduledTime) {
        toast.error("Please select date and time.");
        return;
    }

    setIsUploading(true);
    let finalMediaUrl = undefined;

    try {
        // A) Eğer resim varsa önce Supabase Storage'a yükle
        if (mediaFile) {
            const fileExt = mediaFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images') // Bucket adının 'images' olduğundan emin ol
                .upload(filePath, mediaFile);

            if (uploadError) throw new Error("Upload failed: " + uploadError.message);

            // B) Yüklenen resmin linkini al
            const { data } = supabase.storage.from('images').getPublicUrl(filePath);
            finalMediaUrl = data.publicUrl;
        }

        // C) Postu Planla (URL'i veritabanına kaydet)
        const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        
        createPost.mutate(
          {
            id: `post_${Date.now()}`,
            content: content.trim(),
            mediaUrl: finalMediaUrl, // Link buraya gidiyor
            scheduledTime: dateTime.getTime(),
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            userId: 0, 
          },
          {
            onSuccess: () => {
              setIsUploading(false);
              onClose();
            },
            onError: () => {
              setIsUploading(false);
            }
          }
        );

    } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Something went wrong");
        setIsUploading(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];
  const isLoading = createPost.isPending || isUploading;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Schedule New Cast</DialogTitle>
          <DialogDescription>
            Share your thoughts with the Farcaster community.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* İçerik Alanı */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none focus-visible:ring-purple-500"
            />
          </div>

          {/* Medya (Resim) Alanı */}
          <div className="space-y-2">
            <Label>Media (Optional)</Label>
            
            {mediaPreview ? (
              // Resim Varsa: Önizlemeyi Göster
              <div className="relative group rounded-lg overflow-hidden border border-border w-full h-48 bg-muted/30 flex items-center justify-center">
                <img src={mediaPreview} alt="Preview" className="h-full w-auto object-contain" />
                
                {/* Kaldırma Butonu */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeMedia}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" /> Remove Image
                    </Button>
                </div>
              </div>
            ) : (
              // Resim Yoksa: Yükleme Alanını Göster
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 hover:bg-accent/50 transition-colors cursor-pointer relative">
                <input
                    id="media"
                    type="file"
                    accept="image/*"
                    onChange={handleMediaChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">Click to upload image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Tarih ve Saat */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
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
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]">
              {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? 'Uploading...' : 'Saving...'}
                  </>
              ) : 'Schedule Cast'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}