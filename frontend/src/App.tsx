import { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from './components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import { Loader2 } from 'lucide-react';
import { initFarcaster, FarcasterUser } from './lib/farcaster';

export default function App() {
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const farcasterUser = await initFarcaster();
        if (farcasterUser) {
          setUser(farcasterUser);
        } else {
          // Kullanıcı bulunamadıysa (Bddddddddddddddrowser'da test ediliyorsa vb.)
          console.log("Not in Farcaster context or no user found.");
        }
      } catch (e) {
        console.error("Error loading Farcaster context:", e);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  if (isLoading) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AutoShout Yükleniyor...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Header'a kullanıcı bilgisini prop olarak geçebilirsin */}
        <Header user={user} /> 
        
        <main className="flex-1">
          {user ? (
            // Kullanıcı giriş yapmışsa Dashboard'u göster
            // user.fid'yi Dashboard bileşenine prop olarak geçebilirsin
            <Dashboard user={user} />
          ) : (
            // Kullanıcı yoksa veya tarayıcıdan girildiyse Landing Page
            <div className="container mx-auto px-4 py-16 text-center">
              <h1 className="text-4xl font-bold mb-4">AutoShout</h1>
              <p className="text-muted-foreground mb-8">
                Lütfen bu uygulamayı Farcaster (Warpcast) üzerinden açın.
              </p>
              {/* Test amaçlı QR kod veya deep link eklenebilir */}
            </div>
          )}
        </main>
        <Footer />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}