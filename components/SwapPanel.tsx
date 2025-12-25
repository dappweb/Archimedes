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
  
  const [selectedToken, setSelectedToken] = useState<'ARC' | 'DES'>('ARC');
  const [payAmount, setPayAmount] = useState('');
  const [getAmount, setGetAmount] = useState('');
  const [isSelling, setIsSelling] = useState(false); // false = Buy (Pay USDT), true = Sell (Pay Token)
  const [balanceUSDT, setBalanceUSDT] = useState<string>('0.0');
  const [balanceToken, setBalanceToken] = useState<string>('0.0'); // ARC or DES
  const [poolUSDT, setPoolUSDT] = useState<string>('0.0');
  const [poolToken, setPoolToken] = useState<string>('0.0'); // ARC or DES
  const [isLoading, setIsLoading] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [desBalance, setDesBalance] = useState<string>('0.0'); // Keep separate DES balance for fee check

  // Fetch Balances
  const fetchBalances = async () => {
    if (isConnected && account) {
        try {
            if (usdtContract) {
                const mcBal = await usdtContract.balanceOf(account);
                setBalanceUSDT(ethers.formatEther(mcBal));
                
                const poolMcBal = await usdtContract.balanceOf(CONTRACT_ADDRESSES.PROTOCOL);
                setPoolUSDT(ethers.formatEther(poolMcBal));
            }

            if (selectedToken === 'ARC' && arcContract) {
                const jbcBal = await arcContract.balanceOf(account);
                setBalanceToken(ethers.formatEther(jbcBal));

                const poolJbcBal = await arcContract.balanceOf(CONTRACT_ADDRESSES.PROTOCOL);
                setPoolToken(ethers.formatEther(poolJbcBal));
            } else if (selectedToken === 'DES' && desContract) {
                const desBal = await desContract.balanceOf(account);
                setBalanceToken(ethers.formatEther(desBal));
                setDesBalance(ethers.formatEther(desBal));

                const poolDesBal = await desContract.balanceOf(CONTRACT_ADDRESSES.PROTOCOL);
                setPoolToken(ethers.formatEther(poolDesBal));
            }

        } catch (err) {
            console.error("Failed to fetch balances", err);
        }
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [isConnected, account, usdtContract, arcContract, desContract, provider, selectedToken]);

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
  }, [payAmount, isSelling, poolUSDT, poolToken, selectedToken]);

  const handleSwap = async () => {
      if (!protocolContract || !payAmount) return;
      setIsLoading(true);
      try {
          const amount = ethers.parseEther(payAmount);
          let tx;

          if (isSelling) {
              // Sell (Pay Token -> Get USDT)
              if (selectedToken === 'ARC') {
                  // ARC: 5% Tax
                  if (arcContract) {
                      const allowance = await arcContract.allowance(account, CONTRACT_ADDRESSES.PROTOCOL);
                      if (allowance < amount) {
                          const approveTx = await arcContract.approve(CONTRACT_ADDRESSES.PROTOCOL, ethers.MaxUint256);
                          await approveTx.wait();
                      }
                  }
                  tx = await protocolContract.swapARCToUSDT(amount);
              } else {
                  // DES: 3% Tax (Burn)
                  if (desContract) {
                      const allowance = await desContract.allowance(account, CONTRACT_ADDRESSES.PROTOCOL);
                      if (allowance < amount) {
                          const approveTx = await desContract.approve(CONTRACT_ADDRESSES.PROTOCOL, ethers.MaxUint256);
                          await approveTx.wait();
                      }
                  }
                  tx = await protocolContract.swapDESToUSDT(amount);
              }
          } else {
              // Buy (Pay USDT -> Get Token)
              // ARC needs whitelist, DES does not (based on requirement doc, but let's check doc: DES buy fee 0%, no whitelist mentioned for DES, only for ARC)
              if (selectedToken === 'ARC' && !isWhitelisted) {
                  toast.error(t.swap.notWhitelistedMsg);
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
              
              if (selectedToken === 'ARC') {
                  tx = await protocolContract.swapUSDTToARC(amount);
              } else {
                  tx = await protocolContract.swapUSDTToDES(amount);
              }
          }
          
          await tx.wait();
          toast.success(t.swap.success);
          setPayAmount('');
          setGetAmount('');
          // 刷新余额和池子数据
          await fetchBalances();
      } catch (err: any) {
          toast.error(t.swap.failed + (err.reason || err.message));
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
      const rToken = parseFloat(poolToken);

      let received = 0;

      // AMM Formula: dy = (y * dx) / (x + dx)
      // x = ReserveIn, y = ReserveOut, dx = AmountIn
      
      if (isSelling) {
          // Sell Token (Input Token) -> Get USDT
          // Tax logic
          let taxRate = 0;
          if (selectedToken === 'ARC') taxRate = 0.05; // 5%
          if (selectedToken === 'DES') taxRate = 0.03; // 3%

          const tax = amount * taxRate;
          const amountToSwap = amount - tax;
          
          // AMM Swap (Input Token, Output USDT)
          if (rToken > 0 && rMc > 0) {
              received = (amountToSwap * rMc) / (rToken + amountToSwap);
          }
      } else {
          // Buy Token (Input USDT) -> Get Token
          // AMM Swap (Input USDT, Output Token)
          let outPreTax = 0;
          if (rMc > 0 && rToken > 0) {
              outPreTax = (amount * rToken) / (rMc + amount);
          }
          
          // Tax logic (Buy Tax is 0% for both)
          const tax = outPreTax * 0.00;
          received = outPreTax - tax;
      }
      
      setGetAmount(received.toFixed(4));
  };

  const handleInput = (val: string) => {
      // Get current balance based on selling or buying
      const currentBalance = parseFloat(isSelling ? balanceToken : balanceUSDT);
      const inputAmount = parseFloat(val);
      
      // Check if input exceeds balance
      if (!isNaN(inputAmount) && inputAmount > currentBalance) {
          toast.error(`${t.swap.insufficientBalance}${currentBalance.toFixed(4)} ${isSelling ? selectedToken : 'USDT'}`);
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
              {t.swap.bindReferrerTip}
            </p>
          </div>
        )}

        {/* Whitelist Warning */}
        {isConnected && !isWhitelisted && !isSelling && (
            <div className="bg-red-900/20 border-2 border-red-500/50 rounded-xl p-4 mb-4 relative z-10 animate-fade-in">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <AlertTriangle className="text-red-400" size={20} />
                    <p className="text-red-100 text-sm font-bold">
                        {t.swap.notWhitelisted}
                    </p>
                </div>
                <p className="text-red-300 text-xs text-center">
                    {t.swap.notWhitelistedDesc}
                </p>
            </div>
        )}

        <div className="space-y-3 md:space-y-4 relative z-10">
            {/* Token Selector */}
            <div className="flex bg-dark-card2 rounded-lg p-1 border border-dark-border mb-4">
                <button
                    onClick={() => setSelectedToken('ARC')}
                    className={`flex-1 py-2 rounded-md font-bold transition-all ${
                        selectedToken === 'ARC'
                            ? 'bg-macoin-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    ARC
                </button>
                <button
                    onClick={() => setSelectedToken('DES')}
                    className={`flex-1 py-2 rounded-md font-bold transition-all ${
                        selectedToken === 'DES'
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    DES
                </button>
            </div>

            {/* Pay Input */}
            <div className="bg-dark-card2 p-3 md:p-4 rounded-lg md:rounded-xl border border-dark-border transition-all focus-within:ring-2 focus-within:ring-macoin-500/50">
                <div className="flex justify-between text-xs md:text-sm text-slate-400 mb-2">
                    <span>{t.swap.pay}</span>
                    <span className="truncate ml-2">{t.swap.balance}: {isSelling ? balanceToken : balanceUSDT} {isSelling ? selectedToken : 'USDT'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 flex flex-col">
                        <input
                            type="number"
                            value={payAmount}
                            onChange={(e) => handleInput(e.target.value)}
                            placeholder="0.0"
                            className="bg-transparent text-xl md:text-2xl font-bold focus:outline-none w-full text-white"
                        />
                        <div className="flex items-center justify-between mt-1">
                             <div className="text-xs text-slate-500">
                                 ≈ $ {payAmount ? payAmount : '0.00'}
                             </div>
                             <button 
                                onClick={() => handleInput(isSelling ? balanceToken : balanceUSDT)}
                                className="text-xs bg-dark-card border border-dark-border px-2 py-0.5 rounded text-macoin-400 hover:text-macoin-300 hover:border-macoin-500 transition-colors uppercase font-bold"
                             >
                                Max
                             </button>
                        </div>
                    </div>
                    <span className={`px-2 md:px-3 py-1 rounded-lg font-bold border border-dark-border shadow-sm text-sm md:text-base whitespace-nowrap self-start mt-1 ${isSelling ? (selectedToken === 'ARC' ? 'bg-macoin-500/20 text-macoin-500' : 'bg-amber-500/20 text-amber-500') : 'bg-dark-card text-slate-300'}`}>
                        {isSelling ? selectedToken : 'USDT'}
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
                    <span className="truncate ml-2">{t.swap.balance}: {!isSelling ? balanceToken : balanceUSDT} {!isSelling ? selectedToken : 'USDT'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <input
                        type="text"
                        value={getAmount}
                        disabled
                        placeholder="0.0"
                        className="bg-transparent text-xl md:text-2xl font-bold focus:outline-none w-full text-slate-400"
                    />
                    <span className={`px-2 md:px-3 py-1 rounded-lg font-bold border border-dark-border shadow-sm text-sm md:text-base whitespace-nowrap ${!isSelling ? (selectedToken === 'ARC' ? 'bg-macoin-500/20 text-macoin-500' : 'bg-amber-500/20 text-amber-500') : 'bg-dark-card text-slate-300'}`}>
                        {!isSelling ? selectedToken : 'USDT'}
                    </span>
                </div>
            </div>

            {/* Slippage Info */}
            <div className="bg-red-900/10 border border-red-500/20 p-3 rounded-lg text-xs text-red-400 flex flex-col gap-1">
                <div className={`flex justify-between ${isSelling ? 'font-bold' : 'opacity-50'}`}>
                    <span>{t.swap.slipSell} ({t.swap.taxRate.replace('{rate}', selectedToken === 'ARC' ? '5' : '3')})</span>
                    {isSelling && <span>{t.swap.active}</span>}
                </div>
                <div className={`flex justify-between ${!isSelling ? 'font-bold' : 'opacity-50'}`}>
                    <span>{t.swap.slipBuy} ({t.swap.taxRate.replace('{rate}', '0')})</span>
                    {!isSelling && <span>{t.swap.active}</span>}
                </div>
            </div>

            {/* Pool Stats */}
            <div className="mt-6 pt-4 border-t border-dark-border grid grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="flex flex-col gap-1">
                    <span className="text-slate-400">{t.swap.poolUSDT}</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-macoin-500"></div> <span className="text-slate-200">{parseFloat(poolUSDT).toLocaleString()} USDT</span></span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-slate-400">{t.swap.poolLiquidity} ({selectedToken})</span>
                    <span className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${selectedToken === 'ARC' ? 'bg-purple-500' : 'bg-amber-500'}`}></div> <span className="text-slate-200">{parseFloat(poolToken).toLocaleString()} {selectedToken}</span></span>
                </div>
            </div>

            {/* Action Button */}
            {!isConnected ? (
                 <button disabled className="w-full py-4 bg-slate-800 text-slate-500 font-bold text-lg rounded-xl cursor-not-allowed border border-slate-700">
                    {t.swap.connectWallet}
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
                    {!isSelling && !isWhitelisted ? t.swap.notWhitelisted : t.swap.confirm}
                </button>
            )}
        </div>
    </div>
  );
};

export default SwapPanel;
