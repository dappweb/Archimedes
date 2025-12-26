import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useEthersProvider, useEthersSigner } from './wagmi-adapters';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from './src/config';

console.log("CONTRACT_ADDRESSES in Web3Context:", CONTRACT_ADDRESSES);

// Partial ABIs
export const USDT_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

export const PROTOCOL_ABI = [
  "function bindReferrer(address _referrer) external",
  "function buyTicket(uint256 amount) external",
  "function stakeLiquidity(uint256 cycleDays) external",
  "function reinvest(uint256 cycleDays) external",
  "function claimRewards() external",
  "function redeem() external",
  "function swapUSDTToARC(uint256 usdtAmount) external",
  "function swapARCToUSDT(uint256 arcAmount) external",
  "function swapUSDTToDES(uint256 usdtAmount) external",
  "function swapDESToUSDT(uint256 desAmount) external",
  "function userInfo(address) view returns (address referrer, uint256 activeDirects, uint256 teamCount, uint256 totalRevenue, uint256 currentCap, bool isActive)",
  "function userTicket(address) view returns (uint256 amount, uint256 requiredLiquidity, uint256 purchaseTime, bool liquidityProvided, uint256 liquidityAmount, uint256 startTime, uint256 cycleDays, bool redeemed)",
  "function getDirectReferrals(address) view returns (address[])",
  "function getDirectReferralsData(address) view returns (tuple(address user, uint256 ticketAmount, uint256 joinTime)[])",
  "function owner() view returns (address)",
  "function setWallets(address, address) external",
  "function setCommunityOffice(address office, bool status) external",
  "function setWhitelist(address user, bool status) external",
  "function isWhitelist(address) view returns (bool)",
  "function isCommunityOffice(address) view returns (bool)",
  "function adminSetUserStats(address, uint256, uint256) external",
  "function adminSetReferrer(address, address) external",
  "function getARCPrice() view returns (uint256)",
  "function getAmountOut(uint256, uint256, uint256) pure returns (uint256)",
  "function desFeeFixed() view returns (uint256)",
  "function desFeeRate() view returns (uint256)",
  "event BoundReferrer(address indexed user, address indexed referrer)",
  "event TicketPurchased(address indexed user, uint256 amount)",
  "event LiquidityStaked(address indexed user, uint256 amount, uint256 cycleDays)",
  "event RewardClaimed(address indexed user, uint256 usdtAmount, uint256 arcAmount)",
  "event Redeemed(address indexed user, uint256 principal, uint256 fee)",
  "event SwappedUSDTToARC(address indexed user, uint256 usdtAmount, uint256 arcAmount, uint256 tax)",
  "event SwappedARCToUSDT(address indexed user, uint256 arcAmount, uint256 usdtAmount, uint256 tax)",
  "event SwappedUSDTToDES(address indexed user, uint256 usdtAmount, uint256 desAmount)",
  "event SwappedDESToUSDT(address indexed user, uint256 desAmount, uint256 usdtAmount, uint256 tax)"
];

// Contract Addresses (Sepolia Testnet)
// CONTRACT_ADDRESSES imported from ./src/config

interface Web3ContextType {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  account: string | null;
  connectWallet: () => void;
  isConnected: boolean;
  usdtContract: ethers.Contract | null;
  arcContract: ethers.Contract | null;
  desContract: ethers.Contract | null;
  protocolContract: ethers.Contract | null;
  hasReferrer: boolean;
  isOwner: boolean;
  referrerAddress: string | null;
  checkReferrerStatus: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const provider = useEthersProvider({ chainId });
  const signer = useEthersSigner({ chainId });
  const { openConnectModal } = useConnectModal();

  // Auto Switch Network
  useEffect(() => {
    if (isConnected && chainId !== CHAIN_CONFIG.ID) {
      console.log(`Switching to ${CHAIN_CONFIG.NAME}...`);
      try {
        switchChain({ chainId: CHAIN_CONFIG.ID });
      } catch (error) {
        console.error("Failed to switch network:", error);
      }
    }
  }, [isConnected, chainId, switchChain]);

  const [usdtContract, setUsdtContract] = useState<ethers.Contract | null>(null);
  const [arcContract, setArcContract] = useState<ethers.Contract | null>(null);
  const [desContract, setDesContract] = useState<ethers.Contract | null>(null);
  const [protocolContract, setProtocolContract] = useState<ethers.Contract | null>(null);
  const [hasReferrer, setHasReferrer] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [referrerAddress, setReferrerAddress] = useState<string | null>(null);

  useEffect(() => {
    if (signer) {
        // Init Contracts with Signer (Write access)
        const _usdt = new ethers.Contract(CONTRACT_ADDRESSES.USDT_TOKEN, USDT_ABI, signer);
        const _arc = new ethers.Contract(CONTRACT_ADDRESSES.ARC_TOKEN, USDT_ABI, signer);
        const _des = new ethers.Contract(CONTRACT_ADDRESSES.DES_TOKEN, USDT_ABI, signer);
        const _protocol = new ethers.Contract(CONTRACT_ADDRESSES.PROTOCOL, PROTOCOL_ABI, signer);
        setUsdtContract(_usdt);
        setArcContract(_arc);
        setDesContract(_des);
        setProtocolContract(_protocol);
    } else if (provider) {
        // Init Contracts with Provider (Read only)
        const _usdt = new ethers.Contract(CONTRACT_ADDRESSES.USDT_TOKEN, USDT_ABI, provider);
        const _arc = new ethers.Contract(CONTRACT_ADDRESSES.ARC_TOKEN, USDT_ABI, provider);
        const _des = new ethers.Contract(CONTRACT_ADDRESSES.DES_TOKEN, USDT_ABI, provider);
        const _protocol = new ethers.Contract(CONTRACT_ADDRESSES.PROTOCOL, PROTOCOL_ABI, provider);
        setUsdtContract(_usdt);
        setArcContract(_arc);
        setDesContract(_des);
        setProtocolContract(_protocol);
    } else {
        setUsdtContract(null);
        setArcContract(null);
        setProtocolContract(null);
    }
  }, [signer, provider]);

  // 检查推荐人状态
  const checkReferrerStatus = async () => {
    if (!protocolContract || !address) {
      setHasReferrer(false);
      setIsOwner(false);
      setReferrerAddress(null);
      return;
    }

    try {
      // 检查是否是管理员
      // Add check for contract code
      const contractAddress = await protocolContract.getAddress();
      if (contractAddress === ethers.ZeroAddress) return;

      const code = await provider?.getCode(contractAddress);
      if (code === '0x') {
          console.warn('Contract not deployed on this network');
          return;
      }

      const owner = await protocolContract.owner();
      const ownerStatus = owner.toLowerCase() === address.toLowerCase();
      setIsOwner(ownerStatus);

      // 如果是管理员，不需要推荐人
      if (ownerStatus) {
        setHasReferrer(true);
        setReferrerAddress(null);
        return;
      }

      // 检查是否有推荐人
      const userInfo = await protocolContract.userInfo(address);
      const referrer = userInfo[0]; // referrer is first return value
      const hasRef = referrer !== ethers.ZeroAddress;
      setHasReferrer(hasRef);
      setReferrerAddress(hasRef ? referrer : null);
    } catch (err) {
      console.error('Failed to check referrer status', err);
      setHasReferrer(false);
      setIsOwner(false);
      setReferrerAddress(null);
    }
  };

  useEffect(() => {
    // Check for referral code in URL
    const searchParams = new URLSearchParams(window.location.search);
    const ref = searchParams.get('ref');
    if (ref && ethers.isAddress(ref)) {
      localStorage.setItem('pendingReferrer', ref);
      console.log('Referrer stored:', ref);
    }
  }, []);

  // 检查推荐人状态
  useEffect(() => {
    checkReferrerStatus();
  }, [protocolContract, address]);

  // Auto-bind referrer when connected
  useEffect(() => {
    const bindReferrer = async () => {
        const pendingRef = localStorage.getItem('pendingReferrer');
        if (isConnected && address && protocolContract && pendingRef) { // Changed 'account' to 'address'
            // Validate
            if (pendingRef.toLowerCase() === address.toLowerCase()) return; // Self-ref

            try {
                // Check if already bound
                const userInfo = await protocolContract.userInfo(address);
                const currentReferrer = userInfo[0]; // referrer is first return val

                if (currentReferrer === ethers.ZeroAddress) {
                    console.log("Binding referrer:", pendingRef);
                    // Call bind
                    const tx = await protocolContract.bindReferrer(pendingRef);
                    await tx.wait();
                    console.log("Bind successful");
                    // Clear pending
                    localStorage.removeItem('pendingReferrer');
                    // 重新检查推荐人状态
                    await checkReferrerStatus();
                    // Optional: Show toast or reload
                } else {
                    // Already bound
                    localStorage.removeItem('pendingReferrer');
                }
            } catch (err) {
                console.error("Auto-bind failed", err);
            }
        }
    };
    bindReferrer();
  }, [isConnected, address, protocolContract]); // Changed dependency from 'account' to 'address'

  const connectWallet = () => {
    if (openConnectModal) {
        openConnectModal();
    }
  };

  return (
    <Web3Context.Provider value={{
      provider: provider || null,
      signer: signer || null,
      account: address || null,
      connectWallet,
      isConnected,
      usdtContract,
      arcContract,
      desContract,
      protocolContract,
      hasReferrer,
      isOwner,
      referrerAddress,
      checkReferrerStatus
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
