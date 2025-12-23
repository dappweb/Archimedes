import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc, bscTestnet, sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'Archimedes Protocol',
  projectId: 'YOUR_PROJECT_ID', // Reown (WalletConnect) Project ID. Using placeholder for now or user can update later.
  chains: [sepolia, bsc, bscTestnet],
  transports: {
    [sepolia.id]: http(),
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
});
