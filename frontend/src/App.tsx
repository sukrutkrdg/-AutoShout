import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import ProfileSetupModal from './components/ProfileSetupModal';
import Dashboard from './pages/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { identity, loginStatus } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  if (loginStatus === 'initializing' || (isAuthenticated && profileLoading && !isFetched)) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          {isAuthenticated ? (
            <>
              {showProfileSetup && <ProfileSetupModal />}
              {!showProfileSetup && <Dashboard />}
            </>
          ) : (
            <div className="container mx-auto px-4 py-16">
              <div className="mx-auto max-w-4xl text-center">
                <div className="mb-8 flex justify-center">
                  <img src="/assets/generated/autoshout-logo-transparent.dim_200x200.png" alt="AutoShout" className="h-32 w-32" />
                </div>
                <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                  Automate Your Farcaster <span className="text-primary">Posts</span>
                </h1>
                <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
                  Schedule your Farcaster casts to be automatically published at your desired date and time with AutoShout. 
                  Simplify your content planning and use your time efficiently.
                </p>
                <div className="mb-12 grid gap-6 sm:grid-cols-3">
                  <div className="rounded-lg border bg-card p-6">
                    <div className="mb-2 text-3xl">📅</div>
                    <h3 className="mb-2 font-semibold">Easy Scheduling</h3>
                    <p className="text-sm text-muted-foreground">Plan your posts on a calendar</p>
                  </div>
                  <div className="rounded-lg border bg-card p-6">
                    <div className="mb-2 text-3xl">⚡</div>
                    <h3 className="mb-2 font-semibold">Auto Publishing</h3>
                    <p className="text-sm text-muted-foreground">Automatic publishing at scheduled time</p>
                  </div>
                  <div className="rounded-lg border bg-card p-6">
                    <div className="mb-2 text-3xl">📊</div>
                    <h3 className="mb-2 font-semibold">History Tracking</h3>
                    <p className="text-sm text-muted-foreground">Manage all your posts in one place</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/50 p-8">
                  <h2 className="mb-4 text-2xl font-bold">Login to Get Started</h2>
                  <p className="mb-6 text-muted-foreground">
                    Sign in securely with Internet Identity and start scheduling posts immediately.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
        <Footer />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
