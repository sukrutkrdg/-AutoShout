import { useState, useEffect, useRef } from 'react';
import { useSaveCallerUserProfile, useGetCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, CheckCircle2, ExternalLink, Copy, Smartphone } from 'lucide-react';
import sdk from '@farcaster/frame-sdk';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  
  // Frame Context State
  const [isFrameContext, setIsFrameContext] = useState(false);

  // Polling interval referansı (temizlemek için)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const saveProfile = useSaveCallerUserProfile();

  // Frame Context Kontrolü
  useEffect(() => {
    const checkContext = async () => {
      try {
        const context = await sdk.context;
        if (context) {
          setIsFrameContext(true);
        }
      } catch (e) {
        // Context alınamazsa frame dışındayız demektir, hata basmaya gerek yok
        console.debug("Not in Farcaster frame context");
      }
    };
    checkContext();
  }, []);

  // Mevcut profil varsa state'i doldur
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

  // Component unmount olduğunda polling'i durdur
  useEffect(() => {
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    setIsPolling(false);
  };

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
            toast.success("Account connected successfully! 🎉");
        }
    });
  };

  const createSigner = async () => {
    setIsLoadingSigner(true);
    try {
      const res = await fetch('/api/signer', { method: 'POST' });
      const data = await res.json();
      
      console.log("🔥 API Response:", data);

      if (data.signer_uuid) {
          setSignerUuid(data.signer_uuid);
          
          // Linki yakala (farklı isimlerle gelebilir)
          const url = data.signer_approval_url || data.link || data.url || data.signer_approval_link;
          if (url) setApprovalUrl(url);

          setIsPolling(true);
          pollSignerStatus(data.signer_uuid);
      } else {
          toast.error("Failed to get Signer UUID.");
      }
    } catch (e) {
      console.error("Error:", e);
      toast.error("Failed to create signer.");
    } finally {
      setIsLoadingSigner(false);
    }
  };

  const pollSignerStatus = async (uuid: string) => {
    // Varsa eski polling'i temizle
    stopPolling();

    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/signer?signer_uuid=${uuid}`);
        const data = await res.json();
        
        // Link sonradan gelirse yakala (bazen gecikmeli gelir)
        if (!approvalUrl) {
            const url = data.signer_approval_url || data.link || data.url || data.signer_approval_link;
            if (url) setApprovalUrl(url);
        }

        if (data.status === 'approved') {
          setIsApproved(true);
          stopPolling(); // Polling'i durdur
          handleAutoSave(uuid); // Otomatik kaydet
        }
      } catch (e) { console.error(e); }
    }, 2000); 
    
    // 3 dakika sonra zaman aşımı
    setTimeout(() => {
        if (isPolling) {
            stopPolling();
            toast.error("Connection timed out. Please try again.");
        }
    }, 180000);
  };

  const handleDisconnect = () => {
      setSignerUuid(null);
      setApprovalUrl(null);
      setIsApproved(false);
      stopPolling();
  };

  const copyLink = () => {
      if (approvalUrl) {
          navigator.clipboard.writeText(approvalUrl);
          toast.success("Link copied!");
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !farcasterHandle.trim()) return;
    if (!signerUuid || !isApproved) {
        toast.warning("Please connect your Farcaster account first.");
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
          <DialogTitle>Welcome! 👋</DialogTitle>
          <DialogDescription>Create your profile to start using AutoShout.</DialogDescription>
        </DialogHeader>

        {!signerUuid ? (
          // STEP 1: BAĞLANMA BUTONU
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-center">
               <p className="mb-2 text-sm text-muted-foreground">You need to connect your Farcaster account to schedule casts.</p>
            </div>
            <Button onClick={createSigner} disabled={isLoadingSigner} className="w-full" variant="outline">
              {isLoadingSigner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              Connect Farcaster
            </Button>
          </div>
        ) : !isApproved ? (
           // STEP 2: ONAY BEKLEME EKRANI
           <div className="flex flex-col items-center gap-4 py-2">
             <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin" /> 
                <span>Waiting for Approval</span>
             </div>
             
             {approvalUrl ? (
                 <div className="w-full flex flex-col items-center gap-4">
                    {/* QR Kod - Sadece Masaüstünde Göster (hidden sm:block) */}
                    <div className="bg-white p-2 rounded-lg border shadow-sm hidden sm:block">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(approvalUrl)}`} 
                            alt="Scan to Approve" 
                            className="w-32 h-32"
                        />
                    </div>
                    
                    <div className="text-center space-y-1">
                        <p className="text-xs text-muted-foreground hidden sm:block">
                            Scan with your phone camera or
                        </p>
                        <p className="text-sm font-medium text-foreground sm:hidden flex items-center justify-center gap-1">
                            <Smartphone className="h-4 w-4" /> Tap below to open Warpcast:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                        {/* DÜZELTME: isFrameContext kullanılarak Promise hatası giderildi */}
                        <a 
                            href={approvalUrl}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "default" }), "w-full sm:order-2 cursor-pointer")}
                            onClick={(e) => {
                                // Eğer Frame içindeysek SDK ile açmayı dene
                                if (isFrameContext) {
                                    e.preventDefault();
                                    sdk.actions.openUrl(approvalUrl);
                                }
                            }}
                        >
                            <ExternalLink className="mr-2 h-4 w-4" /> Open Warpcast
                        </a>
                        
                        {/* Masaüstü/Yedek: Linki Kopyala */}
                        <Button variant="outline" onClick={copyLink} className="w-full sm:order-1">
                            <Copy className="mr-2 h-4 w-4" /> Copy Link
                        </Button>
                    </div>
                 </div>
             ) : (
                 <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-xs mt-2 text-muted-foreground">Generating approval link...</p>
                 </div>
             )}

             <Button onClick={handleDisconnect} variant="ghost" size="sm" className="w-full text-destructive mt-2">
                Cancel
             </Button>
           </div>
        ) : (
          // STEP 3: PROFİL BİLGİLERİNİ TAMAMLA
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-center gap-2 rounded-md bg-green-100 p-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Account Connected!
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farcaster">Username</Label>
              <Input id="farcaster" value={farcasterHandle} onChange={(e) => setFarcasterHandle(e.target.value)} required placeholder="john" />
            </div>
            <Button type="submit" className="w-full" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "Saving..." : "Complete Setup"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}