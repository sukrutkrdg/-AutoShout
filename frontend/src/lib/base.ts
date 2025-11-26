/**
 * Base network integration utilities
 * Handles smart contract interactions and wallet connections
 */

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export interface BaseConfig {
  chainId: number;
  rpcUrl: string;
  schedulerAddress: string;
  paymentAddress: string;
}

/**
 * Get Base network configuration based on environment
 */
export function getBaseConfig(): BaseConfig {
  const isMainnet = import.meta.env.VITE_BASE_NETWORK === 'mainnet';
  
  return {
    chainId: isMainnet ? 8453 : 84532,
    rpcUrl: isMainnet ? 'https://mainnet.base.org' : 'https://sepolia.base.org',
    schedulerAddress: import.meta.env.VITE_SCHEDULER_CONTRACT || '0x0000000000000000000000000000000000000000',
    paymentAddress: import.meta.env.VITE_PAYMENT_CONTRACT || '0x0000000000000000000000000000000000000000',
  };
}

/**
 * Connect to Base network wallet
 */
export async function connectWallet(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    console.error('No Ethereum wallet found');
    return null;
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    
    if (!accounts || accounts.length === 0) {
      return null;
    }
    
    // Switch to Base network if needed
    const config = getBaseConfig();
    const chainIdHex = `0x${config.chainId.toString(16)}`;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: config.chainId === 8453 ? 'Base' : 'Base Sepolia',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: [config.rpcUrl],
            blockExplorerUrls: [config.chainId === 8453 ? 'https://basescan.org' : 'https://sepolia.basescan.org'],
          }],
        });
      } else {
        throw switchError;
      }
    }
    
    return accounts[0];
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    return null;
  }
}

/**
 * Get current connected wallet address
 */
export async function getWalletAddress(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts',
    });
    
    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error('Failed to get wallet address:', error);
    return null;
  }
}

/**
 * Schedule a post on the Base network
 * Note: This is a placeholder that would need actual contract interaction
 */
export async function schedulePostOnChain(
  contentHash: string,
  scheduledTime: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const address = await connectWallet();
    if (!address) {
      return { success: false, error: 'Failed to connect wallet' };
    }

    const config = getBaseConfig();
    
    // This is a placeholder for actual contract interaction
    // In production, you would use a library like ethers.js or viem
    // For now, we'll return a mock response
    console.log('Scheduling post on chain:', {
      contentHash,
      scheduledTime,
      contract: config.schedulerAddress,
      from: address,
    });
    
    return {
      success: true,
      txHash: '0x' + Math.random().toString(16).substring(2),
    };
  } catch (error) {
    console.error('Failed to schedule post on chain:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Purchase premium subscription on Base network
 * Note: This is a placeholder that would need actual contract interaction
 */
export async function purchasePremium(): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const address = await connectWallet();
    if (!address) {
      return { success: false, error: 'Failed to connect wallet' };
    }

    const config = getBaseConfig();
    
    // This is a placeholder for actual contract interaction
    // In production, you would use a library like ethers.js or viem
    console.log('Purchasing premium:', {
      contract: config.paymentAddress,
      from: address,
    });
    
    return {
      success: true,
      txHash: '0x' + Math.random().toString(16).substring(2),
    };
  } catch (error) {
    console.error('Failed to purchase premium:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if user has premium subscription
 * Note: This is a placeholder that would need actual contract interaction
 */
export async function checkPremiumStatus(address: string): Promise<boolean> {
  try {
    const config = getBaseConfig();
    
    // This is a placeholder for actual contract interaction
    // In production, you would query the contract via RPC
    console.log('Checking premium status:', {
      address,
      contract: config.paymentAddress,
    });
    
    return false;
  } catch (error) {
    console.error('Failed to check premium status:', error);
    return false;
  }
}

/**
 * Check if wallet is available
 */
export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}
