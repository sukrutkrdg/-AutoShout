import { useState, useEffect } from 'react';
import { useSaveCallerUserProfile, useGetCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, CheckCircle2, ExternalLink, LogOut, AlertCircle, Bug } from 'lucide-react';
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
  
  // Hata Ayıklama için
  const [debugData, setDebugData] = useState<any>(null);

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

  // 1. Signer Oluşturma
  const createSigner = async () => {
    setIsLoadingSigner(true);
    setDebugData(null); // Önceki hataları temizle
    try {
      const res = await fetch('/api/signer', { method: 'POST' });
      const data = await res.json();
      
      console.log("🔥 API Yanıtı:", data); 
      setDebugData(data); // Veriyi ekrana basmak için sakla

      if (data.signer_uuid) {
          setSignerUuid(data.signer_uuid);
          
          // DÜZELTME: Olası tüm URL alanlarını kontrol et
          const url = data.signer_approval_url || data.link || data.url || data.signer_approval_link;
          
          if (url) {
            setApprovalUrl(url);
            setIsPolling(true);
            pollSignerStatus(data.signer_uuid);
          } else {
            console.error("Link bulunamadı. Gelen veri:", data);
            toast.error("Signer oluştu ancak onay linki bulunamadı. Aşağıdaki hata detayına bakın.");
          }
      } else {
          toast.error("Signer UUID alınamadı. API yanıtını kontrol edin.");
      }

    } catch (e) {
      console.error("Failed to create signer:", e);
      toast.error("Signer oluşturulamadı. Sunucu hatası olabilir.");
      setDebugData({ error: e instanceof Error ? e.message : 'Bilinmeyen Hata' });
    } finally {
      setIsLoadingSigner(false);
    }
  };

  // 2. Durum Kontrolü (Polling)
  const pollSignerStatus = async (uuid: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/signer?signer_uuid=${uuid}`);
        const data = await res.json();

        if (data.status === 'approved') {
          setIsApproved(true);
          setIsPolling(false);
          clearInterval(interval);
          handleAutoSave(uuid);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2000); 
    
    // 3 dakika sonra polling'i durdur
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
      setDebugData(null);
  };

  // 3. Linki Açma Fonksiyonu
  const openApprovalLink = () => {
    if (!approvalUrl) {
      toast.error("Onay linki yüklenemedi. Lütfen API yanıtını kontrol edin.");
      return;
    }

    try {
      sdk.actions.openUrl(approvalUrl);
    } catch (e) {
      window.open(approvalUrl, '_blank');
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
          // --- ADIM 1: BAĞLAN ---
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-center">
               <p className="mb-2 text-sm text-muted-foreground">Paylaşım yapabilmemiz için Farcaster hesabını bağlamalısın.</p>
            </div>
            <Button onClick={createSigner} disabled={isLoadingSigner} className="w-full" variant="outline">
              {isLoadingSigner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              Farcaster Hesabını Bağla
            </Button>
            
            {/* Hata varsa göster */}
            {debugData && !debugData.signer_uuid && (
                <div className="w-full rounded-md bg-destructive/10 p-2 text-xs text-destructive overflow-auto">
                    <p className="font-bold flex items-center gap-1"><Bug className="h-3 w-3"/> API Hatası:</p>
                    <pre className="mt-1">{JSON.stringify(debugData, null, 2)}</pre>
                </div>
            )}
          </div>
        ) : !isApproved ? (
           // --- ADIM 2: ONAY BEKLE ---
           <div className="flex flex-col items-center gap-4 py-4">
             <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Onay Bekleniyor</span>
             </div>
             
             {/* URL VARSA BUTONU GÖSTER, YOKSA HATA GÖSTER */}
             {approvalUrl ? (
                 <>
                    <p className="text-center text-xs text-muted-foreground px-4">
                    Aşağıdaki butona tıklayınca Warpcast açılacak. Lütfen açılan ekranda <strong>"Approve"</strong> butonuna basın.
                    </p>
                    <div className="w-full space-y-3">
                        <Button 
                            type="button"
                            className="w-full py-6 text-base"
                            onClick={openApprovalLink}
                        >
                            <ExternalLink className="mr-2 h-5 w-5" />
                            Warpcast'i Aç ve Onayla
                        </Button>
                    </div>
                 </>
             ) : (
                 <div className="w-full space-y-2">
                    <div className="rounded-md bg-red-50 p-3 text-red-800 text-xs border border-red-200">
                        <p className="font-bold mb-1">⚠️ HATA: Onay Linki Bulunamadı</p>
                        <p>Signer oluşturuldu ancak API geçerli bir onay linki (URL) döndürmedi.</p>
                        <p className="mt-2 font-semibold">API Yanıtı (Bunu geliştiriciye iletin):</p>
                        <pre className="mt-1 bg-white p-2 rounded border overflow-x-auto max-h-32 text-[10px]">
                            {JSON.stringify(debugData, null, 2)}
                        </pre>
                    </div>
                 </div>
             )}
                
             {!isPolling && approvalUrl && (
                <div className="flex items-center justify-center gap-2 text-destructive text-xs">
                    <AlertCircle className="h-3 w-3" /> 
                    <span>Süre doldu. Lütfen "İptal Et" diyip tekrar deneyin.</span>
                </div>
             )}

             <Button onClick={handleDisconnect} variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive">
                İptal Et / Geri Dön
             </Button>
           </div>
        ) : (
          // --- ADIM 3: TAMAMLA ---
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2 rounded-md bg-green-100 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> Hesap Başarıyla Bağlandı
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