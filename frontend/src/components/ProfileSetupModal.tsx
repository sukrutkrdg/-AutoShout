import { useState, useEffect } from 'react';
import { useSaveCallerUserProfile, useGetCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, CheckCircle2, ExternalLink, LogOut } from 'lucide-react';
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

  // --- MOBİL DÜZELTME (Bu kısım arka planda çalışacak) ---
  const openApprovalLink = () => {
    if (!approvalUrl) return;

    // Linki 'https://client.farcaster.xyz/...' formatından 'warpcast://...' formatına çevir
    // Bu işlem mobilde uygulamanın direk açılmasını sağlar.
    let mobileUrl = approvalUrl;
    if (approvalUrl.startsWith('https://client.farcaster.xyz/deeplinks/')) {
        mobileUrl = approvalUrl.replace('https://client.farcaster.xyz/deeplinks/', 'warpcast://');
    }

    try {
      sdk.actions.openUrl(mobileUrl);
    } catch (e) {
      window.open(mobileUrl, '_blank');
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
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e: any) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome! 👋</DialogTitle>
          <DialogDescription>Create your profile to start using AutoShout.</DialogDescription>
        </DialogHeader>

        {!signerUuid ? (
          // STEP 1: Connect
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
           // STEP 2: Approve (QR Kodsuz, Sade ve Çalışan Versiyon)
           <div className="flex flex-col items-center gap-4 py-4">
             <p className="text-sm font-medium text-yellow-600">Waiting for Approval...</p>
             <p className="text-center text-xs text-muted-foreground">
               Click the button below to open Warpcast and approve the signer.
             </p>
             
             <div className="w-full space-y-2">
                {/* DÜZELTME: Doğrudan <a> tagi yerine onClick eventi kullanıyoruz.
                    Böylece linki 'warpcast://' formatına çevirip mobilde açılmasını sağlıyoruz.
                */}
                <Button className="w-full" onClick={openApprovalLink} disabled={!approvalUrl}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {approvalUrl ? "Open Warpcast & Approve" : "Generating Link..."}
                </Button>
                
                <Button onClick={handleDisconnect} variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive">
                    Cancel
                </Button>
             </div>

             <div className="flex items-center gap-2 text-xs text-muted-foreground">
               {isPolling ? <Loader2 className="h-3 w-3 animate-spin" /> : null} 
               {isPolling ? "Checking status..." : "Timeout. Please try again."}
             </div>
           </div>
        ) : (
          // STEP 3: Finalize
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2 rounded-md bg-green-100 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> Account Connected
                </div>
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDisconnect}
                    className="h-6 text-xs text-muted-foreground hover:text-destructive"
                >
                    <LogOut className="mr-1 h-3 w-3" /> Connect different account
                </Button>
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