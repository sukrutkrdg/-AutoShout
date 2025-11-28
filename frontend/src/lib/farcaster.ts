import sdk from '@farcaster/frame-sdk';

export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

/**
 * Farcaster Context'ini başlatır ve kullanıcı bilgisini döner.
 * Uygulama yüklendiğinde bu fonksiyon çağrılmalıdır.
 */
export async function initFarcaster(): Promise<FarcasterUser | null> {
  try {
    // SDK'nın context verisini yüklemesini bekle
    const context = await sdk.context;
    
    // Farcaster'a uygulamanın hazır olduğunu bildir (Splash screen'i kaldırır)
    sdk.actions.ready();

    // Eğer bir kullanıcı ile frame içinde açıldıysa bilgileri döndür
    if (context && context.user) {
      console.log("Farcaster User Found:", context.user);
      return {
        fid: context.user.fid,
        username: context.user.username,
        displayName: context.user.displayName,
        pfpUrl: context.user.pfpUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('Farcaster SDK Init Error:', error);
    return null;
  }
}

/**
 * Uygulamanın Farcaster Frame içinde çalışıp çalışmadığını kontrol eder.
 */
export function isFarcasterContext(): boolean {
  return !!sdk.context;
}

/**
 * Kullanıcıyı paylaşım yapması için Warpcast composer'a yönlendirir.
 * (Otomatik paylaşım için backend/signer gerekir, bu manuel tetikleme içindir)
 */
export function openComposer(text: string) {
  try {
    sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`);
  } catch (e) {
    console.error("Composer açılırken hata:", e);
    // Fallback: Standart web linki
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`, '_blank');
  }
}

/**
 * Kullanıcının profilini kapatır (Frame'i kapatır)
 */
export function closeFrame() {
  try {
    sdk.actions.close();
  } catch (e) {
    console.error("Frame kapatılamadı:", e);
  }
}