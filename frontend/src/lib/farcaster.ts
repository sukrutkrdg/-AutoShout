/**
 * Farcaster Mini App integration utilities
 * Handles authentication, cast publishing, and API interactions
 */

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp?: string;
  bio?: string;
}

export interface CastData {
  text: string;
  embeds?: string[];
  parent?: string;
}

export interface ScheduledCastResponse {
  success: boolean;
  castHash?: string;
  error?: string;
}

/**
 * Get Farcaster user information from the current session
 */
export async function getFarcasterUser(): Promise<FarcasterUser | null> {
  try {
    // In a real Farcaster Mini App, this would use the Farcaster SDK
    // For now, this is a placeholder that would be replaced with actual SDK calls
    const response = await fetch('/api/farcaster/user', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to get Farcaster user:', error);
    return null;
  }
}

/**
 * Publish a cast to Farcaster
 */
export async function publishCast(castData: CastData): Promise<ScheduledCastResponse> {
  try {
    const response = await fetch('/api/farcaster/cast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(castData),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to publish cast',
      };
    }
    
    return {
      success: true,
      castHash: result.hash,
    };
  } catch (error) {
    console.error('Failed to publish cast:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify if the app is running in a Farcaster Mini App context
 */
export function isFarcasterMiniApp(): boolean {
  // Check if running in Farcaster Mini App context
  // This would check for specific Farcaster SDK globals or URL parameters
  return typeof window !== 'undefined' && 
         (window.location.search.includes('farcaster=true') || 
          'farcaster' in window);
}

/**
 * Get Farcaster Mini App configuration
 */
export function getFarcasterConfig() {
  return {
    appId: import.meta.env.VITE_FARCASTER_APP_ID || 'autoshout',
    apiEndpoint: import.meta.env.VITE_FARCASTER_API_ENDPOINT || 'https://api.warpcast.com/v2',
  };
}
