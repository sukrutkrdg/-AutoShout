import { Button } from '@/components/ui/button';
import { Plus, LogOut, Loader2 } from 'lucide-react';
import { useGetCallerUserProfile, useDisconnectUser } from '../hooks/useQueries';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from './mode-toggle';

interface HeaderProps {
  onOpenScheduler?: () => void;
  user?: any;
}

export default function Header({ onOpenScheduler, user }: HeaderProps) {
  const { data: profile } = useGetCallerUserProfile();
  const disconnect = useDisconnectUser();

  // Profil fotoğrafı: SDK'dan gelen, yoksa Warpcast'ten, yoksa boş.
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        
        {/* SOL TARAFTAKİ LOGO */}
        <div className="flex items-center gap-2 font-bold text-xl bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
          <span>📢 AutoShout</span>
        </div>

        {/* SAĞ TARAFTAKİ BUTONLAR GRUBU */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* New Cast Butonu (Sadece Dashboard'da) */}
          {onOpenScheduler && (
            <Button size="sm" onClick={onOpenScheduler} className="hidden sm:flex gap-1 bg-purple-600 hover:bg-purple-700 text-white border-0">
                <Plus className="h-4 w-4" />
                <span>New Cast</span>
            </Button>
          )}

          {/* Tema Butonu (Artık sadece ikon, menü yok) */}
          <ModeToggle /> 

          {/* Profil Menüsü */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 border border-input ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ml-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl} alt={handle} className="object-cover" />
                  <AvatarFallback className="text-xs">{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            
            {/* Menü İçeriği */}
            <DropdownMenuContent align="end" className="w-56 z-[60]">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">@{handle}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Mobilde New Cast butonu menü içine gelir */}
              {onOpenScheduler && (
                 <DropdownMenuItem onClick={onOpenScheduler} className="sm:hidden cursor-pointer text-purple-600 focus:text-purple-600">
                    <Plus className="mr-2 h-4 w-4" />
                    <span>New Cast</span>
                 </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer focus:bg-red-50 dark:focus:bg-red-950/50">
                {disconnect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4" />} 
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}