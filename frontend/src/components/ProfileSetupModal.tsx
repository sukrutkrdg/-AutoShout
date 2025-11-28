import { useState, useEffect } from 'react';
import { useSaveCallerUserProfile, useGetCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, CheckCircle2, ExternalLink, LogOut, Copy } from 'lucide-react';
import sdk from '@farcaster/frame-sdk';
import { toast } from 'sonner';

export default function ProfileSetupModal() {
  const { data: userProfile, isLoading: isProfileLoading } = useGetCallerUserProfile();
  
  const [name, setName] = useState('');
  const [farcasterHandle, setFarcasterHandle] = useState('');
  
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
          
          // Linki yakala
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
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/signer?signer_uuid=${uuid}`);
        const data = await res.json();
        
        // Link sonradan gelirse yakala
        if (!approvalUrl) {
            const url = data.signer_approval_url || data.link || data.url || data.signer_approval_link;
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

  // --- SİHİRLİ MOBİL LİNK DÜZELTMESİ ---
  const openApprovalLink = () => {
    if (!approvalUrl) return;

    // 1. Linki mobil uygulama şemasına (warpcast://) çevir
    let mobileUrl = approvalUrl;
    if (approvalUrl.startsWith('https://client.farcaster.xyz/deeplinks/')) {
        mobileUrl = approvalUrl.replace('https://client.farcaster.xyz/deeplinks/', 'warpcast://');
    }

    console.log("Attempting to open:", mobileUrl);

    try {
      // 2. Önce SDK ile açmayı dene (En temiz yöntem)
      sdk.actions.openUrl(mobileUrl);
    } catch (e) {
      console.log("SDK failed, trying window methods...");
      
      // 3. SDK çalışmazsa standart yöntemleri dene
      // window.open bazen popup blocker'a takılır, bu yüzden...
      const opened = window.open(mobileUrl, '_blank');
      
      // 4. window.open da çalışmazsa sayfayı direkt yönlendir (Kesin çözüm)
      if (!opened) {
          window.location.href = mobileUrl;
      }
    }
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
          // BAĞLANMA EKRANI
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
           // ONAY BEKLEME EKRANI
           <div className="flex flex-col items-center gap-4 py-4">
             <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                <Loader2 className="h-4 w-4 animate-spin" /> 
                <span className="text-sm font-medium">Waiting for Approval</span>
             </div>
             
             <div className="text-center px-4 space-y-2">
               <p className="text-xs text-muted-foreground">
                 Tap the button below to open Warpcast and approve the signer.
               </p>
             </div>
             
             <div className="w-full space-y-2">
                {/* BU BUTON ARTIK MOBİLDE KESİN ÇALIŞIR */}
                <Button className="w-full py-6 text-base" onClick={openApprovalLink} disabled={!approvalUrl}>
                    <ExternalLink className="mr-2 h-5 w-5" />
                    {approvalUrl ? "Open Warpcast & Approve" : "Generating Link..."}
                </Button>
                
                {/* Yedek olarak Kopyala butonu */}
                <Button variant="outline" onClick={copyLink} className="w-full" disabled={!approvalUrl}>
                    <Copy className="mr-2 h-4 w-4" /> Copy Link (Backup)
                </Button>

                <Button onClick={handleDisconnect} variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive">
                    Cancel
                </Button>
             </div>
           </div>
        ) : (
          // KAYIT TAMAMLAMA EKRANI
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