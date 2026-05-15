import { useState, useEffect, useRef } from 'react';
import { useSaveCallerUserProfile, useGetCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, CheckCircle2, ExternalLink, Copy, Smartphone, CalendarClock, Image as ImageIcon, Zap } from 'lucide-react';
import sdk from '@farcaster/frame-sdk';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FarcasterUser } from '@/lib/farcaster';

interface ProfileSetupModalProps {
  user?: FarcasterUser | null;
}

export default function ProfileSetupModal({ user }: ProfileSetupModalProps) {
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
        console.debug("Not in Farcaster frame context");
      }
    };
    checkContext();
  }, []);

  // Profil bilgilerini doldur: önce Supabase profili, yoksa Farcaster SDK verisi
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setFarcasterHandle(userProfile.farcasterHandle || '');
      if (userProfile.signerUuid) {
        setSignerUuid(userProfile.signerUuid);
        setIsApproved(true);
      }
    } else if (!isProfileLoading && user) {
      // Supabase'den profil gelmedi, Farcaster SDK'dan al
      setName(user.displayName || '');
      setFarcasterHandle(user.username || '');
    }
  }, [userProfile, isProfileLoading, user]);

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
    const finalName = name.trim() || userProfile?.name || user?.displayName || 'User';
    const finalHandle = farcasterHandle.trim() || userProfile?.farcasterHandle || user?.username || 'user';

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
    stopPolling();

    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/signer?signer_uuid=${uuid}`);
        const data = await res.json();
        
        if (!approvalUrl) {
            const url = data.signer_approval_url || data.link || data.url || data.signer_approval_link;
            if (url) setApprovalUrl(url);
        }

        if (data.status === 'approved') {
          setIsApproved(true);
          stopPolling();
          handleAutoSave(uuid); 
        }
      } catch (e) { console.error(e); }
    }, 2000); 
    
    // 3 dakika zaman aşımı
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
        
        {!signerUuid ? (
          // STEP 1: TANITIM VE BAĞLANMA EKRANI
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent font-bold">
                Welcome to AutoShout 📢
              </DialogTitle>
              <DialogDescription className="text-center">
                Automate your Farcaster presence with ease.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
                {/* Özellikler */}
                <div className="grid gap-3 text-sm">
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                        <CalendarClock className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                            <span className="font-semibold block">Schedule Casts</span>
                            Plan your posts ahead of time and let us handle the publishing.
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                        <ImageIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <span className="font-semibold block">Media Support</span>
                            Easily upload and attach images to your scheduled casts.
                        </div>
                    </div>
                </div>

                {/* Ücret Uyarısı */}
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:bg-yellow-900/20 dark:border-yellow-800">
                    <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="text-xs text-yellow-800 dark:text-yellow-200">
                            <span className="font-semibold block mb-1">One-time Connection Fee</span>
                            Farcaster protocol may require a small fee (Warps) to approve this app as a signer. This goes to the network, not us.
                        </div>
                    </div>
                </div>

                <Button onClick={createSigner} disabled={isLoadingSigner} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  {isLoadingSigner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                  Connect Farcaster
                </Button>
            </div>
          </>
        ) : !isApproved ? (
           // STEP 2: ONAY BEKLEME EKRANI
           <div className="flex flex-col items-center gap-4 py-2">
             <DialogHeader>
                <DialogTitle>Approve Signer</DialogTitle>
             </DialogHeader>

             <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin" /> 
                <span>Waiting for Approval</span>
             </div>
             
             {approvalUrl ? (
                 <div className="w-full flex flex-col items-center gap-4">
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
                        <a 
                            href={approvalUrl}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "default" }), "w-full sm:order-2 cursor-pointer bg-purple-600 hover:bg-purple-700")}
                            onClick={(e) => {
                                if (isFrameContext) {
                                    e.preventDefault();
                                    sdk.actions.openUrl(approvalUrl);
                                }
                            }}
                        >
                            <ExternalLink className="mr-2 h-4 w-4" /> Open Warpcast
                        </a>
                        
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
          <>
            <DialogHeader>
                <DialogTitle>Profile Setup</DialogTitle>
            </DialogHeader>
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
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? "Saving..." : "Complete Setup"}
                </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}