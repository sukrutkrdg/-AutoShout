import { useState } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function ProfileSetupModal() {
  const [name, setName] = useState('');
  const [farcasterHandle, setFarcasterHandle] = useState('');
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !farcasterHandle.trim()) return;

    saveProfile.mutate({
      name: name.trim(),
      farcasterHandle: farcasterHandle.trim().replace('@', ''),
      isPremium: false,
      // DÜZELTME: BigInt yerine normal timestamp (number) kullanıyoruz
      createdAt: Date.now(), 
    });
  };

  return (
    <Dialog open={true}>
      {/* DÜZELTME: 'any' hatasını önlemek için e tipi belirtildi veya inline handle edildi */}
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e: any) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Hoş Geldin! 👋</DialogTitle>
          <DialogDescription>
            AutoShout'u kullanmaya başlamak için lütfen profil bilgilerini tamamla.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Adın</Label>
            <Input
              id="name"
              placeholder="Adını gir"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="farcaster">Farcaster Kullanıcı Adı</Label>
            <Input
              id="farcaster"
              placeholder="username"
              value={farcasterHandle}
              onChange={(e) => setFarcasterHandle(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">@ işareti olmadan girin</p>
          </div>
          <Button type="submit" className="w-full" disabled={saveProfile.isPending}>
            {saveProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Devam Et
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}