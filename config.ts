import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { 
  tokenPocketWallet,
  metaMaskWallet,
  walletConnectWallet,
  trustWallet,
  rainbowWallet,
  okxWallet,
  bitgetWallet
} from '@rainbow-me/rainbowkit/wallets';
import { bsc, bscTestnet, sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'Archimedes Protocol',
  projectId: 'YOUR_PROJECT_ID', // Reown (WalletConnect) Project ID
  chains: [sepolia, bsc, bscTestnet],
  transports: {
    [sepolia.id]: http(),
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        tokenPocketWallet,
        metaMaskWallet,
        trustWallet,
        okxWallet,
        walletConnectWallet,
      ],
    },
    {
      groupName: 'Others',
      wallets: [
        rainbowWallet,
        bitgetWallet,
      ],
    },
  ],
});
