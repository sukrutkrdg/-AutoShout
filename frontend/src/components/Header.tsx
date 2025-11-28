import { Button } from '@/components/ui/button';
import { Plus, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FarcasterUser } from '../lib/farcaster';

interface HeaderProps {
  onOpenScheduler?: () => void; // Opsiyonel yaptık
  user?: FarcasterUser | null;  // User prop'unu ekledik
}

export default function Header({ onOpenScheduler, user }: HeaderProps) {

  const handleLogout = () => {
      window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2 font-bold text-xl">
          <span>📢 AutoShout</span>
        </div>

        <div className="flex items-center gap-2">
          {/* onOpenScheduler varsa butonu göster, yoksa (App.tsx'ten çağrıldığında) gösterme */}
          {onOpenScheduler && (
            <Button size="sm" onClick={onOpenScheduler} className="gap-1">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Cast</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.pfpUrl} />
                  <AvatarFallback>{user?.displayName?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Hesabım ({user?.username})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* disabled prop'u yerine class ve style kullanıyoruz */}
              <DropdownMenuItem className="opacity-50 cursor-not-allowed">
                <Settings className="mr-2 h-4 w-4" /> Ayarlar (Yakında)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" /> Yenile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}