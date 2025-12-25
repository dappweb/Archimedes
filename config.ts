import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { 
  tokenPocketWallet,
  metaMaskWallet,
  walletConnectWallet,
  trustWallet,
  rainbowWallet,
  okxWallet,
  bitgetWallet
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { bsc, bscTestnet, sepolia } from 'wagmi/chains';

const projectId = 'YOUR_PROJECT_ID'; // Reown (WalletConnect) Project ID

const connectors = connectorsForWallets(
  [
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
  {
    appName: 'Archimedes Protocol',
    projectId,
  }
);

export const config = createConfig({
  chains: [sepolia, bsc, bscTestnet],
  transports: {
    [sepolia.id]: http(),
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
  connectors,
});
