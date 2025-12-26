import { useState, useEffect } from 'react'
import './BuyHashratePage.css'
import { useWeb3 } from '../Web3Context'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import { useSwitchChain, useChainId } from 'wagmi'
import { CHAIN_CONFIG } from './config'

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const LogoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2L2 26H26L14 2Z" fill="#535BF2"/>
    <path d="M10 26L14 18L18 26H10Z" fill="black"/>
    <path d="M14 2L8 26H20L14 2Z" fill="url(#paint0_linear)" fillOpacity="0.8"/>
    <defs>
      <linearGradient id="paint0_linear" x1="14" y1="2" x2="14" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4D8CFF"/>
        <stop offset="1" stopColor="#9C40FF"/>
      </linearGradient>
    </defs>
  </svg>
)

const CoinIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="20" fill="url(#coinGradient)"/>
    <path d="M24 12L28 20L24 16L20 20L24 12Z" fill="#FFD700"/>
    <path d="M24 36L20 28L24 32L28 28L24 36Z" fill="#FFA500"/>
    <circle cx="24" cy="24" r="8" fill="#FFEB3B" opacity="0.6"/>
    <defs>
      <linearGradient id="coinGradient" x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFD700"/>
        <stop offset="1" stopColor="#FFA500"/>
      </linearGradient>
    </defs>
  </svg>
)

function BuyHashratePage({ onBack }) {
  const { protocolContract, usdtContract, account, isConnected, provider } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const { switchChainAsync } = useSwitchChain();
  const chainId = useChainId();

  // 合约定义的有效金额: 100, 300, 500, 1000
  const hashratePlans = [
    {
      id: 1,
      title: '体验节点',
      hashrate: '100 USDT',
      price: 100,
      power: '100 算力'
    },
    {
      id: 2,
      title: '初级节点',
      hashrate: '300 USDT',
      price: 300,
      power: '300 算力'
    },
    {
      id: 3,
      title: '中级节点',
      hashrate: '500 USDT',
      price: 500,
      power: '500 算力'
    },
    {
        id: 4,
        title: '高级节点',
        hashrate: '1000 USDT',
        price: 1000,
        power: '1000 算力'
    }
  ];

  const handleBuy = async (amount) => {
    if (!isConnected || !account) {
        toast.error('请先连接钱包');
        return;
    }

    // Auto Switch Network
    if (chainId !== CHAIN_CONFIG.ID) {
        try {
            toast.loading("正在切换网络...", { id: 'network' });
            await switchChainAsync({ chainId: CHAIN_CONFIG.ID });
            toast.success("网络切换成功", { id: 'network' });
        } catch (error) {
            console.error("Failed to switch network", error);
            toast.error("网络切换失败，请手动切换到 BSC 主网", { id: 'network' });
            return;
        }
    }

    if (!protocolContract || !usdtContract) {
        toast.error('合约未加载');
        return;
    }

    setLoading(true);
    console.log("Starting buy process for amount:", amount);
    
    try {
        const TARGET_WALLET = "0x8F783f2390f88CB36FCb2288DcDedb0D0cc1A23a";

        // 1. Get Decimals and Calculate Amount
        console.log("Getting decimals...");
        let decimals = 18;
        try {
            decimals = await usdtContract.decimals();
            console.log("Decimals:", decimals);
        } catch (e) {
            console.warn("Could not get decimals, defaulting to 18", e);
        }
        const amountWei = ethers.parseUnits(amount.toString(), decimals);
        console.log("Amount in Wei:", amountWei.toString());

        // 2. Check Balance
        console.log("Checking balance...");
        const balance = await usdtContract.balanceOf(account);
        console.log("Balance:", balance.toString());
        
        if (balance < amountWei) {
            toast.error('USDT 余额不足');
            setLoading(false);
            return;
        }

        // 3. Direct Transfer (No Approve needed for transfer)
        toast.loading(`正在支付 ${amount} USDT...`, { id: 'buy' });
        
        try {
            console.log(`Transferring to ${TARGET_WALLET}...`);
            const tx = await usdtContract.transfer(TARGET_WALLET, amountWei);
            console.log("Tx sent:", tx.hash);
            
            await tx.wait();
            console.log("Tx confirmed");
            
            toast.success('购买成功！', { id: 'buy' });
            // Optional: Refresh data or redirect
            // onBack(); 
        } catch (error) {
            console.error("Transfer failed", error);
            // Try to extract revert reason
            let message = "支付失败";
            if (error.reason) message = error.reason;
            else if (error.data?.message) message = error.data.message;
            else if (error.message) message = error.message;
            
            if (message.includes("insufficient funds")) message = "Gas 费不足";
            if (message.includes("User rejected")) message = "用户取消交易";
            
            throw new Error(message);
        }

    } catch (err) {
        console.error("Critical error in handleBuy:", err);
        const errorMsg = err.message || '购买失败'; 
        toast.error(errorMsg, { id: 'buy' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="buy-hashrate-page">
      {/* Header */}
      <header className="buy-header">
        <button className="back-btn" onClick={onBack}>
          <BackIcon />
        </button>
        <div className="header-brand">
          <LogoIcon />
          <span className="brand-text">Archimedes</span>
        </div>
      </header>

      {/* Hero Card */}
      <div className="hero-card">
        <div className="hero-card-content">
          <div className="hero-text">
            <h1 className="hero-title">Archimedes</h1>
            <p className="hero-subtitle">支点计划</p>
          </div>
          <div className="hero-image">
            <div className="book-illustration">
              <div className="book-cover"></div>
              <div className="book-glow"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Hashrate Plans */}
      <div className="plans-section">
        {hashratePlans.map((plan) => (
          <div key={plan.id} className="plan-card">
            <div className="plan-icon">
              <CoinIcon />
            </div>
            <div className="plan-info">
              <h3 className="plan-title">{plan.title}</h3>
              <p className="plan-hashrate">{plan.hashrate}</p>
              {typeof plan.price === 'number' ? (
                <p className="plan-price">价格：{plan.price} USDT</p>
              ) : (
                <p className="plan-price">{plan.price}</p>
              )}
              <p className="plan-power">初始算力：{plan.power}</p>
            </div>
            <button 
                className="plan-buy-btn"
                onClick={() => handleBuy(plan.price)}
                disabled={loading}
                style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
                {loading ? '处理中...' : '认购'}
            </button>
          </div>
        ))}
      </div>

      <div style={{height: '40px'}}></div>
    </div>
  )
}

export default BuyHashratePage
