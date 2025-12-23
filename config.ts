import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc, bscTestnet } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'Archimedes Protocol',
  projectId: 'YOUR_PROJECT_ID', // Reown (WalletConnect) Project ID. Using placeholder for now or user can update later.
  chains: [bsc, bscTestnet],
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
});
