import { useState } from 'react';
import { useCreateScheduledPost } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Supabase eklendi
import { toast } from 'sonner'; // Hata mesajları için

interface PostSchedulerProps {
  onClose: () => void;
}

export default function PostScheduler({ onClose }: PostSchedulerProps) {
  const createPost = useCreateScheduledPost();
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false); // Yükleme durumu

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Boyut kontrolü (örnek: 5MB)
      if (file.size > 5 * 1024 * 1024) {
          toast.error("File size too large (max 5MB)");
          return;
      }
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
    if (!content.trim() && !mediaFile) {
        toast.error("Please enter text or add an image.");
        return;
    }
    if (!scheduledDate || !scheduledTime) {
        toast.error("Please select date and time.");
        return;
    }

    setIsUploading(true); // Yükleme başladı
    let uploadedMediaUrl = undefined;

    try {
        // 1. Resmi Supabase Storage'a Yükle
        if (mediaFile) {
            const fileExt = mediaFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images') // 1. Adımda oluşturduğumuz bucket adı
                .upload(filePath, mediaFile);

            if (uploadError) {
                throw new Error("Image upload failed: " + uploadError.message);
            }

            // 2. Resmin Public URL'ini al
            const { data } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);
            
            uploadedMediaUrl = data.publicUrl;
            console.log("Image uploaded:", uploadedMediaUrl);
        }

        // 3. Postu Planla (URL ile birlikte)
        const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const scheduledTimeMs = dateTime.getTime();

        createPost.mutate(
          {
            id: `post_${Date.now()}`,
            content: content.trim(),
            mediaUrl: uploadedMediaUrl, // URL buraya gidiyor
            scheduledTime: scheduledTimeMs,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule New Cast</DialogTitle>
          <DialogDescription>
            Specify the content and time you want to share on Farcaster.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{content.length} characters</p>
          </div>

          <div className="space-y-2">
            <Label>Media (Optional)</Label>
            {mediaPreview ? (
              <div className="relative group">
                <img src={mediaPreview} alt="Preview" className="h-48 w-full rounded-lg object-cover border border-border" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeMedia}
                    >
                      <X className="h-4 w-4 mr-2" /> Remove Image
                    </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 hover:bg-accent/50 transition-colors">
                <label htmlFor="media" className="cursor-pointer text-center w-full">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">Click to upload image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB</p>
                  <input
                    id="media"
                    type="file"
                    accept="image/*"
                    onChange={handleMediaChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? 'Uploading...' : 'Schedule Cast'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}