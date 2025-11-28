import { useState, useEffect } from 'react';
import { useSaveCallerUserProfile, useGetCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, CheckCircle2, ExternalLink, LogOut, Copy, RefreshCw } from 'lucide-react';
import sdk from '@farcaster/frame-sdk';
import { toast } from 'sonner';

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

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setFarcasterHandle(userProfile.farcasterHandle || '');
      if (userProfile.signerUuid) {
        setSignerUuid(userProfile.signerUuid);
        setIsApproved(true);
      }
    }
  }, [userProfile]);

  const handleAutoSave = (approvedUuid: string) => {
    const finalName = name.trim() || userProfile?.name || 'User';
    const finalHandle = farcasterHandle.trim() || userProfile?.farcasterHandle || 'user';

    saveProfile.mutate({
      name: finalName,
      farcasterHandle: finalHandle.replace('@', ''),
      isPremium: false,
      createdAt: Date.now(),
      signerUuid: approvedUuid
    }, {
        onSuccess: () => {
            toast.success("Hesap bağlandı ve kaydedildi! 🎉");
        }
    });
  };

  const createSigner = async () => {
    setIsLoadingSigner(true);
    try {
      const res = await fetch('/api/signer', { method: 'POST' });
      const data = await res.json();
      
      console.log("🔥 API Yanıtı:", data);

      if (data.signer_uuid) {
          setSignerUuid(data.signer_uuid);
          
          const url = data.signer_approval_url || data.link || data.url || data.signer_approval_link;
          if (url) setApprovalUrl(url);

          setIsPolling(true);
          pollSignerStatus(data.signer_uuid);
      } else {
          toast.error("Signer UUID alınamadı.");
      }
    } catch (e) {
      console.error("Hata:", e);
      toast.error("İşlem başarısız.");
    } finally {
      setIsLoadingSigner(false);
    }
  };

  const pollSignerStatus = async (uuid: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/signer?signer_uuid=${uuid}`);
        const data = await res.json();
        
        // Link sonradan gelirse yakala
        if (!approvalUrl) {
            const url = data.signer_approval_url || data.link || data.url;
            if (url) setApprovalUrl(url);
        }

        if (data.status === 'approved') {
          setIsApproved(true);
          setIsPolling(false);
          clearInterval(interval);
          handleAutoSave(uuid);
        }
      } catch (e) { console.error(e); }
    }, 2000); 
    
    setTimeout(() => {
        clearInterval(interval);
        if (!isApproved) setIsPolling(false);
    }, 180000);
  };

  const handleDisconnect = () => {
      setSignerUuid(null);
      setApprovalUrl(null);
      setIsApproved(false);
      setIsPolling(false);
  };

  // 3. Güvenli Link Açma
  const openApprovalLink = () => {
    if (!approvalUrl) return;

    // Eğer link warpcast:// ise ve mobildeysek, sdk.actions ile açmayı dene
    // Değilse yeni sekmede aç
    try {
      sdk.actions.openUrl(approvalUrl);
    } catch (e) {
      console.log("SDK openUrl fail, fallback to window.open");
      window.open(approvalUrl, '_blank');
    }
  };

  const copyLink = () => {
      if (approvalUrl) {
          navigator.clipboard.writeText(approvalUrl);
          toast.success("Link kopyalandı! Tarayıcıda açabilirsiniz.");
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !farcasterHandle.trim()) return;
    
    if (!signerUuid || !isApproved) {
        toast.warning("Lütfen önce Farcaster hesabınızı bağlayın.");
        return;
    }

    saveProfile.mutate({
      name: name.trim(),
      farcasterHandle: farcasterHandle.trim().replace('@', ''),
      isPremium: false,
      createdAt: Date.now(),
      signerUuid: signerUuid
    });
  };
  
  if (isProfileLoading) return null;

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e: any) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Hoşgeldin! 👋</DialogTitle>
          <DialogDescription>
            AutoShout'u kullanmak için profilini oluştur ve yetki ver.
          </DialogDescription>
        </DialogHeader>

        {!signerUuid ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <Button onClick={createSigner} disabled={isLoadingSigner} className="w-full" variant="outline">
              {isLoadingSigner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              Farcaster Hesabını Bağla
            </Button>
          </div>
        ) : !isApproved ? (
           <div className="flex flex-col items-center gap-4 py-4">
             <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Onay Bekleniyor</span>
             </div>
             
             {/* --- LİNK GÖSTERİM ALANI (DEBUG İÇİN) --- */}
             {approvalUrl ? (
                 <div className="w-full space-y-3">
                    <div className="p-2 bg-muted rounded text-[10px] break-all font-mono text-muted-foreground border">
                        {approvalUrl}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={openApprovalLink} className="w-full">
                            <ExternalLink className="mr-2 h-4 w-4" /> Aç
                        </Button>
                        <Button variant="outline" onClick={copyLink} className="w-full">
                            <Copy className="mr-2 h-4 w-4" /> Kopyala
                        </Button>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                        Eğer buton açmıyorsa, linki kopyalayıp tarayıcıda yapıştırın.
                    </p>
                 </div>
             ) : (
                 <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-xs mt-2 text-muted-foreground">Onay linki oluşturuluyor...</p>
                 </div>
             )}

             <Button onClick={handleDisconnect} variant="ghost" size="sm" className="w-full text-destructive">
                İptal
             </Button>
           </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-center gap-2 rounded-md bg-green-100 p-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Hesap Başarıyla Bağlandı
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Görünen Adın</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farcaster">Kullanıcı Adın</Label>
              <Input id="farcaster" value={farcasterHandle} onChange={(e) => setFarcasterHandle(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "Kaydediliyor..." : "Kaydı Tamamla"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}