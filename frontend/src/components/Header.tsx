import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, LogOut, Loader2 } from 'lucide-react';
import { useGetCallerUserProfile, useDisconnectUser } from '../hooks/useQueries';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModeToggle } from './mode-toggle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface HeaderProps {
  onOpenScheduler?: () => void;
  user?: any;
}

export default function Header({ onOpenScheduler, user }: HeaderProps) {
  const { data: profile } = useGetCallerUserProfile();
  const disconnect = useDisconnectUser();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  // Profil fotoğrafı ve isim belirleme
  const avatarUrl = user?.pfpUrl || 
                    (profile?.farcasterHandle ? `https://warpcast.com/avatar/${profile.farcasterHandle}` : undefined);
  
  const displayName = user?.displayName || profile?.name || 'User';
  const handle = user?.username || profile?.farcasterHandle || 'user';

  const handleLogout = async () => {
      try {
        await disconnect.mutateAsync();
      } catch (e) {
        console.error("Logout error:", e);
      }
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          
          {/* LOGO */}
          <div className="flex items-center gap-2 font-bold text-xl bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            <span>📢 AutoShout</span>
          </div>

          {/* SAĞ TARAF */}
          <div className="flex items-center gap-3">
            
            {/* New Cast Butonu */}
            {onOpenScheduler && (
              <Button size="sm" onClick={onOpenScheduler} className="hidden sm:flex gap-1 bg-purple-600 hover:bg-purple-700 text-white border-0">
                  <Plus className="h-4 w-4" />
                  <span>New Cast</span>
              </Button>
            )}

            {/* Tema Butonu */}
            <ModeToggle /> 

            {/* Kullanıcı Bilgisi (Sadece Masaüstünde Görünür) */}
            <div className="hidden flex-col items-end sm:flex mr-1">
              <span className="text-sm font-medium leading-none">{displayName}</span>
              <span className="text-xs text-muted-foreground">@{handle}</span>
            </div>

            {/* Profil Fotosu (Tıklayınca Çıkış Onayı Açar) */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsLogoutOpen(true)}
              className="rounded-full h-9 w-9 border border-input ring-offset-background transition-colors hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:border-red-800"
              title="Click to Log Out"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={handle} className="object-cover" />
                <AvatarFallback className="text-xs">{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </div>
      </header>

      {/* Çıkış Onay Penceresi */}
      <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">
              {disconnect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4" />}
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}