import { useState, useEffect } from 'react';
import { useSaveCallerUserProfile, useGetCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, CheckCircle2, ExternalLink, LogOut } from 'lucide-react';
import sdk from '@farcaster/frame-sdk';

export default function ProfileSetupModal() {
  const { data: userProfile, isLoading: isProfileLoading } = useGetCallerUserProfile();
  
  const [name, setName] = useState('');
  const [farcasterHandle, setFarcasterHandle] = useState('');
  
  // Signer States
  const [signerUuid, setSignerUuid] = useState<string | null>(null);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoadingSigner, setIsLoadingSigner] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const saveProfile = useSaveCallerUserProfile();

  // Mevcut profil varsa doldur
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setFarcasterHandle(userProfile.farcasterHandle || '');
      // Eğer kullanıcının zaten kayıtlı bir signer'ı varsa durumu 'onaylandı' kabul et
      if (userProfile.signerUuid) {
        setSignerUuid(userProfile.signerUuid);
        setIsApproved(true);
      }
    }
  }, [userProfile]);

  // 1. Signer Oluşturma Fonksiyonu
  const createSigner = async () => {
    setIsLoadingSigner(true);
    try {
      // Call our secure backend API
      const res = await fetch('/api/signer', { method: 'POST' });
      const data = await res.json();
      
      setSignerUuid(data.signer_uuid);
      setApprovalUrl(data.signer_approval_url);
      
      // Start polling for approval status
      setIsPolling(true);
      pollSignerStatus(data.signer_uuid);
      
      // Try to open URL directly if in Frame context
      if (data.signer_approval_url) {
         try {
             sdk.actions.openUrl(data.signer_approval_url);
         } catch (e) {
             console.log("Frame openUrl failed, falling back to manual click.");
         }
      }

    } catch (e) {
      console.error("Failed to create signer:", e);
    } finally {
      setIsLoadingSigner(false);
    }
  };

  // 2. Poll for Signer Status
  const pollSignerStatus = async (uuid: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/signer?signer_uuid=${uuid}`);
        const data = await res.json();

        if (data.status === 'approved') {
          setIsApproved(true);
          setIsPolling(false);
          clearInterval(interval); // Stop polling
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2000); // Check every 2 seconds
    
    // 2 dakika sonra polling'i durdur (Timeout)
    setTimeout(() => {
        clearInterval(interval);
        setIsPolling(false);
    }, 120000);
  };

  // Bağlantıyı Kesme (Reset)
  const handleDisconnect = () => {
      setSignerUuid(null);
      setApprovalUrl(null);
      setIsApproved(false);
      setIsPolling(false);
      // İstersen burada veritabanından da signer_uuid'yi silebilirsin,
      // ama şimdilik sadece frontend state'ini sıfırlıyoruz.
  };

  // 3. Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !farcasterHandle.trim()) return;
    
    if (!signerUuid || !isApproved) {
        alert("Lütfen önce Farcaster hesabınızı bağlayın.");
        return;
    }

    // Save profile with the new signer_uuid
    saveProfile.mutate({
      name: name.trim(),
      farcasterHandle: farcasterHandle.trim().replace('@', ''),
      isPremium: false,
      createdAt: Date.now(),
      signerUuid: signerUuid // Passing the approved signer UUID
    });
  };
  
  if (isProfileLoading) return null; // Yüklenirken boş göster

  // Eğer zaten kayıtlıysa ve signer'ı varsa modalı gösterme (veya sadece düzenleme modu açılabilir)
  // Ancak "ilk kurulum" mantığı olduğu için şimdilik her zaman açık bırakıyoruz.
  // Kullanıcı UX'ini iyileştirmek için istersen buraya `if (userProfile?.signerUuid) return null;` ekleyebilirsin.

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e: any) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Hoşgeldin! 👋</DialogTitle>
          <DialogDescription>
            AutoShout'u kullanmak için profilini oluştur ve yetki ver.
          </DialogDescription>
        </DialogHeader>

        {!signerUuid ? (
          // --- STEP 1: CONNECT ACCOUNT ---
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-center">
               <p className="mb-2 text-sm text-muted-foreground">Paylaşım yapabilmemiz için Farcaster hesabını bağlamalısın.</p>
            </div>
            <Button onClick={createSigner} disabled={isLoadingSigner} className="w-full" variant="outline">
              {isLoadingSigner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              Farcaster Hesabını Bağla
            </Button>
          </div>
        ) : !isApproved ? (
           // --- STEP 2: AWAIT APPROVAL ---
           <div className="flex flex-col items-center gap-4 py-4">
             <p className="text-sm font-medium text-yellow-600">Onay Bekleniyor...</p>
             <p className="text-center text-xs text-muted-foreground">
               Lütfen aşağıdaki butona tıkla ve Warpcast'te açılan pencerede "Approve" de.
             </p>
             
             <div className="w-full space-y-2">
                <Button asChild className="w-full">
                    <a href={approvalUrl!} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Onaylamak için Tıkla
                    </a>
                </Button>
                
                <Button onClick={handleDisconnect} variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive">
                    İptal Et / Geri Dön
                </Button>
             </div>

             <div className="flex items-center gap-2 text-xs text-muted-foreground">
               {isPolling ? <Loader2 className="h-3 w-3 animate-spin" /> : null} 
               {isPolling ? "Durum kontrol ediliyor..." : "Zaman aşımı. Tekrar deneyin."}
             </div>
           </div>
        ) : (
          // --- STEP 3: FINALIZE PROFILE ---
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2 rounded-md bg-green-100 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> Hesap Bağlandı
                </div>
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDisconnect}
                    className="h-6 text-xs text-muted-foreground hover:text-destructive"
                >
                    <LogOut className="mr-1 h-3 w-3" /> Farklı hesap bağla
                </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Görünen Adın</Label>
              <Input
                id="name"
                placeholder="Örn: Şükrü"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farcaster">Kullanıcı Adın</Label>
              <Input
                id="farcaster"
                placeholder="sukru"
                value={farcasterHandle}
                onChange={(e) => setFarcasterHandle(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={saveProfile.isPending}>
              {saveProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydı Tamamla
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}