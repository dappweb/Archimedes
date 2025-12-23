import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { useWeb3 } from '../Web3Context';
import { CONTRACT_ADDRESSES } from '../src/config';
import { ArrowLeftRight, RotateCw, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const SwapPanel: React.FC = () => {
  const { t } = useLanguage();
  const { usdtContract, arcContract, protocolContract, account, isConnected, provider, hasReferrer, isOwner } = useWeb3();
  
  const [payAmount, setPayAmount] = useState('');
  const [getAmount, setGetAmount] = useState('');
  const [isSelling, setIsSelling] = useState(false); // false = Buy ARC (Pay USDT), true = Sell ARC (Pay ARC)
  const [balanceUSDT, setBalanceUSDT] = useState<string>('0.0');
  const [balanceARC, setBalanceARC] = useState<string>('0.0');
  const [poolUSDT, setPoolUSDT] = useState<string>('0.0');
  const [poolARC, setPoolARC] = useState<string>('0.0');
  const [isLoading, setIsLoading] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  // 提取余额获取逻辑为独立函数，方便在交易后刷新
  const fetchBalances = async () => {
    if (isConnected && account) {
        try {
            if (usdtContract) {
                // Fetch ERC20 USDT Balance (Contract uses ERC20)
                const mcBal = await usdtContract.balanceOf(account);
                setBalanceUSDT(ethers.formatEther(mcBal));

                // Pool Liquidity (USDT is ERC20 in contract)
                const poolMcBal = await usdtContract.balanceOf(CONTRACT_ADDRESSES.PROTOCOL);
                setPoolUSDT(ethers.formatEther(poolMcBal));
            }

            if (arcContract) {
                const jbcBal = await arcContract.balanceOf(account);
                setBalanceARC(ethers.formatEther(jbcBal));

                // Pool Liquidity
                const poolJbcBal = await arcContract.balanceOf(CONTRACT_ADDRESSES.PROTOCOL);
                setPoolARC(ethers.formatEther(poolJbcBal));
            }

        } catch (err) {
            console.error("Failed to fetch balances", err);
        }
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [isConnected, account, usdtContract, arcContract, provider]);

  // Check Whitelist Status
  useEffect(() => {
    const checkWhitelist = async () => {
        if (protocolContract && account) {
            try {
                const status = await protocolContract.isWhitelist(account);
                setIsWhitelisted(status);
            } catch (err) {
                console.error("Failed to check whitelist", err);
            }
        }
    };
    checkWhitelist();
  }, [protocolContract, account]);

  // Debounce effect for calculating estimate
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateEstimate(payAmount);
    }, 1000);

    return () => clearTimeout(timer);
  }, [payAmount, isSelling, poolUSDT, poolARC]);

  const handleSwap = async () => {
      if (!protocolContract || !payAmount) return;
      setIsLoading(true);
      try {
          const amount = ethers.parseEther(payAmount);
          let tx;

          if (isSelling) {
              // Sell ARC: Approve ARC -> SwapARCToUSDT
              if (arcContract) {
                  const allowance = await arcContract.allowance(account, CONTRACT_ADDRESSES.PROTOCOL);
                  if (allowance < amount) {
                      const approveTx = await arcContract.approve(CONTRACT_ADDRESSES.PROTOCOL, ethers.MaxUint256);
                      await approveTx.wait();
                  }
              }
              tx = await protocolContract.swapARCToUSDT(amount);
          } else {
              // Buy ARC: Check Whitelist -> Approve USDT -> SwapUSDTToARC
              if (!isWhitelisted) {
                  toast.error("You are not whitelisted to buy ARC!");
                  setIsLoading(false);
                  return;
              }

              if (usdtContract) {
                  const allowance = await usdtContract.allowance(account, CONTRACT_ADDRESSES.PROTOCOL);
                  if (allowance < amount) {
                      const approveTx = await usdtContract.approve(CONTRACT_ADDRESSES.PROTOCOL, ethers.MaxUint256);
                      await approveTx.wait();
                  }
              }
              tx = await protocolContract.swapUSDTToARC(amount);
          }
          
          await tx.wait();
          toast.success("Swap Successful!");
          setPayAmount('');
          setGetAmount('');
          // 刷新余额和池子数据
          await fetchBalances();
      } catch (err: any) {
          toast.error("Swap Failed: " + (err.reason || err.message));
      } finally {
          setIsLoading(false);
      }
  };

  const calculateEstimate = (val: string) => {
      if (!val) {
          setGetAmount('');
          return;
      }
      
      const amount = parseFloat(val);
      if (isNaN(amount) || amount <= 0) {
          setGetAmount('');
          return;
      }

      const rMc = parseFloat(poolUSDT);
      const rJbc = parseFloat(poolARC);

      let received = 0;

      // AMM Formula: dy = (y * dx) / (x + dx)
      // x = ReserveIn, y = ReserveOut, dx = AmountIn
      
      if (isSelling) {
          // Sell ARC (Input ARC) -> Get USDT
          // 1. Tax 5% on Input (Total sell tax is 5%)
          // NOTE: Contract logic: 5% tax.
          const tax = amount * 0.05;
          const amountToSwap = amount - tax;
          
          // 2. AMM Swap (Input ARC, Output USDT)
          // ReserveIn = ARC Pool, ReserveOut = USDT Pool
          if (rJbc > 0 && rMc > 0) {
              received = (amountToSwap * rMc) / (rJbc + amountToSwap);
          }
      } else {
          // Buy ARC (Input USDT) -> Get ARC
          // 1. AMM Swap (Input USDT, Output ARC)
          // ReserveIn = USDT Pool, ReserveOut = ARC Pool
          let outPreTax = 0;
          if (rMc > 0 && rJbc > 0) {
              outPreTax = (amount * rJbc) / (rMc + amount);
          }
          
          // 2. Tax 0% on Output (Buy tax is 0 in contract)
          const tax = outPreTax * 0.00;
          received = outPreTax - tax;
      }
      
      setGetAmount(received.toFixed(4));
  };

  const handleInput = (val: string) => {
      // Get current balance based on selling or buying
      const currentBalance = parseFloat(isSelling ? balanceARC : balanceUSDT);
      const inputAmount = parseFloat(val);
      
      // Check if input exceeds balance
      if (!isNaN(inputAmount) && inputAmount > currentBalance) {
          toast.error(`Insufficient balance. Max: ${currentBalance.toFixed(4)} ${isSelling ? 'ARC' : 'USDT'}`);
          setPayAmount(currentBalance.toString());
          return;
      }
      
      setPayAmount(val);
  };

  const toggleDirection = () => {
      setIsSelling(!isSelling);
      setIsRotated(!isRotated);
      setPayAmount('');
      setGetAmount('');
  };

  return (
    <div className="max-w-md mx-auto mt-4 md:mt-10 glass-panel p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl relative animate-fade-in bg-dark-card border border-dark-border">
        <div className="absolute inset-0 bg-macoin-500/5 blur-3xl rounded-full"></div>
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-center relative z-10 text-white">{t.swap.title}</h2>

        {/* 推荐人提示 - 非管理员且未绑定推荐人时显示 */}
        {isConnected && !hasReferrer && !isOwner && (
          <div className="bg-amber-900/20 border-2 border-amber-500/50 rounded-xl p-4 mb-4 relative z-10">
            <p className="text-amber-100 text-sm font-bold text-center">
              ⚠️ {t.referrer.noReferrer}
            </p>
            <p className="text-amber-300 text-xs text-center mt-1">
              Please go to Mining panel to bind a referrer first
            </p>
          </div>
        )}

        {/* Whitelist Warning */}
        {isConnected && !isWhitelisted && !isSelling && (
            <div className="bg-red-900/20 border-2 border-red-500/50 rounded-xl p-4 mb-4 relative z-10 animate-fade-in">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <AlertTriangle className="text-red-400" size={20} />
                    <p className="text-red-100 text-sm font-bold">
                        Not Whitelisted
                    </p>
                </div>
                <p className="text-red-300 text-xs text-center">
                    You cannot buy ARC. Please contact admin to be whitelisted.
                </p>
            </div>
        )}

        <div className="space-y-3 md:space-y-4 relative z-10">
            {/* Pay Input */}
            <div className="bg-dark-card2 p-3 md:p-4 rounded-lg md:rounded-xl border border-dark-border transition-all focus-within:ring-2 focus-within:ring-macoin-500/50">
                <div className="flex justify-between text-xs md:text-sm text-slate-400 mb-2">
                    <span>{t.swap.pay}</span>
                    <span className="truncate ml-2">{t.swap.balance}: {isSelling ? balanceARC : balanceUSDT} {isSelling ? 'ARC' : 'USDT'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <input
                        type="number"
                        value={payAmount}
                        onChange={(e) => handleInput(e.target.value)}
                        placeholder="0.0"
                        className="bg-transparent text-xl md:text-2xl font-bold focus:outline-none w-full text-white"
                    />
                    <span className={`px-2 md:px-3 py-1 rounded-lg font-bold border border-dark-border shadow-sm text-sm md:text-base whitespace-nowrap ${isSelling ? 'bg-yellow-500/20 text-yellow-500' : 'bg-dark-card text-slate-300'}`}>
                        {isSelling ? 'ARC' : 'USDT'}
                    </span>
                </div>
            </div>

            {/* Switch Button */}
            <div className="flex justify-center -my-1.5 md:-my-2 relative z-20">
                <button
                    onClick={toggleDirection}
                    className={`bg-dark-card border border-macoin-500 p-1.5 md:p-2 rounded-full text-macoin-400 transition-transform duration-500 shadow-sm hover:shadow-md ${isRotated ? 'rotate-180' : ''}`}
                >
                    <ArrowLeftRight size={18} className="md:w-5 md:h-5" />
                </button>
            </div>

            {/* Receive Input */}
            <div className="bg-dark-card2 p-3 md:p-4 rounded-lg md:rounded-xl border border-dark-border">
                    <div className="flex justify-between text-xs md:text-sm text-slate-400 mb-2">
                    <span>{t.swap.get}</span>
                    <span className="truncate ml-2">{t.swap.balance}: {!isSelling ? balanceARC : balanceUSDT} {!isSelling ? 'ARC' : 'USDT'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <input
                        type="text"
                        value={getAmount}
                        disabled
                        placeholder="0.0"
                        className="bg-transparent text-xl md:text-2xl font-bold focus:outline-none w-full text-slate-400"
                    />
                    <span className={`px-2 md:px-3 py-1 rounded-lg font-bold border border-dark-border shadow-sm text-sm md:text-base whitespace-nowrap ${!isSelling ? 'bg-yellow-500/20 text-yellow-500' : 'bg-dark-card text-slate-300'}`}>
                        {!isSelling ? 'ARC' : 'USDT'}
                    </span>
                </div>
            </div>

            {/* Slippage Info */}
            <div className="bg-red-900/10 border border-red-500/20 p-3 rounded-lg text-xs text-red-400 flex flex-col gap-1">
                <div className={`flex justify-between ${isSelling ? 'font-bold' : 'opacity-50'}`}>
                    <span>{t.swap.slipSell} (5% Tax)</span>
                    {isSelling && <span>(Active)</span>}
                </div>
                <div className={`flex justify-between ${!isSelling ? 'font-bold' : 'opacity-50'}`}>
                    <span>{t.swap.slipBuy} (0% Tax)</span>
                    {!isSelling && <span>(Active)</span>}
                </div>
            </div>

            {/* Pool Stats */}
            <div className="mt-6 pt-4 border-t border-dark-border grid grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="flex flex-col gap-1">
                    <span className="text-slate-400">Pool Liquidity (USDT)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-macoin-500"></div> <span className="text-slate-200">{parseFloat(poolUSDT).toLocaleString()} USDT</span></span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-slate-400">Pool Liquidity (ARC)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> <span className="text-slate-200">{parseFloat(poolARC).toLocaleString()} ARC</span></span>
                </div>
            </div>

            {/* Action Button */}
            {!isConnected ? (
                 <button disabled className="w-full py-4 bg-slate-800 text-slate-500 font-bold text-lg rounded-xl cursor-not-allowed border border-slate-700">
                    Connect Wallet
                </button>
            ) : !hasReferrer && !isOwner ? (
                <button disabled className="w-full py-4 bg-amber-900/50 text-amber-500 font-bold text-lg rounded-xl cursor-not-allowed border border-amber-900">
                    ⚠️ {t.referrer.noReferrer}
                </button>
            ) : (
                <button 
                    onClick={handleSwap}
                    disabled={isLoading || !payAmount || (!isSelling && !isWhitelisted)}
                    className="w-full py-4 bg-gradient-to-r from-macoin-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:shadow-lg hover:shadow-macoin-500/20 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                    {isLoading && <RotateCw className="animate-spin" size={20} />}
                    {!isSelling && !isWhitelisted ? "Not Whitelisted" : t.swap.confirm}
                </button>
            )}
        </div>
    </div>
  );
};

export default SwapPanel;
