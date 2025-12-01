import { Button } from '@/components/ui/button';
import { Plus, Settings, LogOut, Loader2 } from 'lucide-react';
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
import { ModeToggle } from './mode-toggle'; // <--- YENİ EKLENDİ

interface HeaderProps {
  onOpenScheduler?: () => void;
  user?: any;
}

export default function Header({ onOpenScheduler }: HeaderProps) {
  const { data: profile } = useGetCallerUserProfile();
  const disconnect = useDisconnectUser();

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
      <div className="container mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2 font-bold text-xl bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
          {/* Logo rengini de biraz daha havalı yaptık */}
          <span>📢 AutoShout</span>
        </div>

        <div className="flex items-center gap-2">
          {/* --- Tema Değiştirme Butonu Buraya Eklendi --- */}
          <ModeToggle /> 

          {onOpenScheduler && (
            <Button size="sm" onClick={onOpenScheduler} className="gap-1 bg-purple-600 hover:bg-purple-700 text-white border-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Cast</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8 border-2 border-purple-100 dark:border-purple-900">
                  <AvatarImage src={`https://warpcast.com/avatar/${profile?.farcasterHandle}`} />
                  <AvatarFallback>{profile?.name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Hesabım ({profile?.farcasterHandle || 'user'})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" /> Ayarlar (Yakında)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                {disconnect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4" />} 
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}