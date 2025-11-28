import { useState, useEffect } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, CheckCircle2, ExternalLink } from 'lucide-react';
import sdk from '@farcaster/frame-sdk';

export default function ProfileSetupModal() {
  const [name, setName] = useState('');
  const [farcasterHandle, setFarcasterHandle] = useState('');
  
  // Signer States
  const [signerUuid, setSignerUuid] = useState<string | null>(null);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoadingSigner, setIsLoadingSigner] = useState(false);

  const saveProfile = useSaveCallerUserProfile();

  // 1. Create Signer Function
  const createSigner = async () => {
    setIsLoadingSigner(true);
    try {
      // Call our secure backend API
      const res = await fetch('/api/signer', { method: 'POST' });
      const data = await res.json();
      
      setSignerUuid(data.signer_uuid);
      setApprovalUrl(data.signer_approval_url);
      
      // Start polling for approval status
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
          clearInterval(interval); // Stop polling
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2000); // Check every 2 seconds
  };

  // 3. Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !farcasterHandle.trim()) return;
    
    if (!signerUuid || !isApproved) {
        alert("Please connect your Farcaster account first.");
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

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e: any) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome! 👋</DialogTitle>
          <DialogDescription>
            Please create your profile and connect your Farcaster account to start using AutoShout.
          </DialogDescription>
        </DialogHeader>

        {!signerUuid ? (
          // --- STEP 1: CONNECT ACCOUNT ---
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-center">
               <p className="mb-2 text-sm text-muted-foreground">You need to delegate write access to schedule posts.</p>
            </div>
            <Button onClick={createSigner} disabled={isLoadingSigner} className="w-full" variant="outline">
              {isLoadingSigner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              Connect Farcaster Account
            </Button>
          </div>
        ) : !isApproved ? (
           // --- STEP 2: AWAIT APPROVAL ---
           <div className="flex flex-col items-center gap-4 py-4">
             <p className="text-sm font-medium text-yellow-600">Waiting for Approval...</p>
             <p className="text-center text-xs text-muted-foreground">
               Please click the button below and approve the signer in Warpcast.
             </p>
             
             <div className="rounded-lg border p-4 w-full">
                <Button asChild className="w-full">
                    <a href={approvalUrl!} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Click to Approve
                    </a>
                </Button>
             </div>
             <div className="flex items-center gap-2 text-xs text-muted-foreground">
               <Loader2 className="h-3 w-3 animate-spin" /> Checking status...
             </div>
           </div>
        ) : (
          // --- STEP 3: FINALIZE PROFILE ---
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-center gap-2 rounded-md bg-green-100 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" /> Account Connected!
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="e.g. Alice"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farcaster">Farcaster Username</Label>
              <Input
                id="farcaster"
                placeholder="alice"
                value={farcasterHandle}
                onChange={(e) => setFarcasterHandle(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={saveProfile.isPending}>
              {saveProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}