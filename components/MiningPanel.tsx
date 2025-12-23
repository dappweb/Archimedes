import React, { useState, useMemo, useEffect } from 'react';
import { TICKET_TIERS, MINING_PLANS } from '../constants';
import { MiningPlan, TicketTier } from '../types';
import { Zap, Clock, TrendingUp, AlertCircle, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useWeb3 } from '../Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const MiningPanel: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<TicketTier>(TICKET_TIERS[0]);
  const [selectedPlan, setSelectedPlan] = useState<MiningPlan>(MINING_PLANS[0]);
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false);
  const [isTicketBought, setIsTicketBought] = useState(false); // New state to track ticket purchase
  const [hasActiveTicket, setHasActiveTicket] = useState(false); // Track if user has active ticket
  const [canStakeLiquidity, setCanStakeLiquidity] = useState(false);
  const [isTicketExpired, setIsTicketExpired] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [inputReferrerAddress, setInputReferrerAddress] = useState('');
  const [isBindingReferrer, setIsBindingReferrer] = useState(false);
  const [jbcPrice, setJbcPrice] = useState<bigint>(0n);
  
  // DES Fee State
  const [desBalance, setDesBalance] = useState<bigint>(0n);
  const [desAllowance, setDesAllowance] = useState<bigint>(0n);
  const [desFeeFixed, setDesFeeFixed] = useState<bigint>(0n);
  const [desFeeRate, setDesFeeRate] = useState<bigint>(0n);

  const { t } = useLanguage();
  const { protocolContract, usdtContract, desContract, account, isConnected, hasReferrer, isOwner, referrerAddress, checkReferrerStatus } = useWeb3();

  // Fetch ARC Price and Fee Percent
  useEffect(() => {
      const fetchData = async () => {
          if (protocolContract) {
              try {
                  const price = await protocolContract.getARCPrice();
                  setArcPrice(price);
                  
                  // Fetch DES Fee Info
                  const fixed = await protocolContract.desFeeFixed();
                  const rate = await protocolContract.desFeeRate();
                  setDesFeeFixed(fixed);
                  setDesFeeRate(rate);

              } catch (e) {
                  console.error("Failed to fetch contract data", e);
              }
          }
      };
      fetchData();
  }, [protocolContract]);

  // Fetch DES Balance & Allowance
  useEffect(() => {
    const fetchDesData = async () => {
        if (protocolContract && desContract && account) {
            try {
                const bal = await desContract.balanceOf(account);
                setDesBalance(bal);
                
                const allow = await desContract.allowance(account, await protocolContract.getAddress());
                setDesAllowance(allow);
            } catch (e) {
                console.error("Failed to fetch DES data", e);
            }
        }
    };
    fetchDesData();
  }, [protocolContract, desContract, account, txPending]); // Refresh on tx finish

  // Calculations based on PDF logic
  const totalInvestment = selectedTicket.amount + selectedTicket.requiredLiquidity;
  const dailyROI = (selectedTicket.amount * selectedPlan.dailyRate) / 100;
  const totalROI = dailyROI * selectedPlan.days;

  // Split Rewards Calculation
  const mcRewardPart = totalROI / 2;
  const jbcRewardValue = totalROI / 2;
  // Calculate JBC Amount: (Value in MC * 1e18) / Price
  const priceNum = Number(ethers.formatEther(jbcPrice || 1000000000000000000n)); // Avoid div by zero
  const jbcRewardAmount = priceNum > 0 ? jbcRewardValue / priceNum : 0;

  // 3x Cap Calculation
  const maxCap = selectedTicket.amount * 3;

  // Check if user has active ticket
  const checkTicketStatus = async () => {
      if (!protocolContract || !account) return;

      try {
          const ticket = await protocolContract.userTicket(account);

          console.log("ticket info:", {
              amount: ticket.amount.toString(),
              liquidityProvided: ticket.liquidityProvided,
              redeemed: ticket.redeemed,
              purchaseTime: Number(ticket.purchaseTime),
              requiredLiquidity: ticket.requiredLiquidity.toString(),
          });

          const now = Math.floor(Date.now() / 1000);

          // 1️⃣ 是否买过票（amount > 0）
          const hasTicket = ticket.amount > 0n;

          // 2️⃣ 是否已质押（liquidityProvided && !redeemed）
          const isStaked = ticket.liquidityProvided && !ticket.redeemed;

          // 3️⃣ 是否已赎回（redeemed == true）
          const isRedeemed = ticket.redeemed;

          // 4️⃣ 是否已过期（超过72小时且未质押且未赎回）
          const isExpired =
              hasTicket &&
              !ticket.liquidityProvided &&
              !isRedeemed &&
              now > Number(ticket.purchaseTime) + 72 * 3600;

          // 5️⃣ 是否可以质押（已买票 && 未质押 && 未过期 && 未赎回）
          const canStake =
              hasTicket &&
              !ticket.liquidityProvided &&
              !isExpired &&
              !isRedeemed;

          // ====== 更新 UI 状态 ======
          setIsTicketBought(hasTicket && !isRedeemed);  // 有有效票据（未赎回）
          setHasActiveTicket(isStaked);                  // 是否已经质押
          setCanStakeLiquidity(canStake);                // 是否可以质押
          setIsTicketExpired(isExpired);                 // 是否过期

      } catch (err) {
          console.error("Failed to check ticket status", err);
      }
  };

  useEffect(() => {
    checkTicketStatus()
  }, [protocolContract, account]);

  useEffect(() => {
    const checkAllowance = async () => {
        if (usdtContract && account && protocolContract) {
            setIsCheckingAllowance(true);
            try {
                const protocolAddr = await protocolContract.getAddress();
                const allowance = await usdtContract.allowance(account, protocolAddr);
                // Check if allowance covers the total investment required
                // Using a slightly lower threshold to catch "already approved infinite"
                // or just check against the needed amount
                const requiredWei = ethers.parseEther(totalInvestment.toString());

                if (allowance >= requiredWei) {
                    setIsApproved(true);
                } else {
                    setIsApproved(false);
                }
            } catch (err) {
                console.error("Failed to check allowance", err);
            } finally {
                setIsCheckingAllowance(false);
            }
        }
    };
    checkAllowance();
  }, [usdtContract, account, protocolContract, totalInvestment]);

  const handleApprove = async () => {
      if (!usdtContract || !protocolContract) return;
      setTxPending(true);
      try {
          const tx = await usdtContract.approve(await protocolContract.getAddress(), ethers.MaxUint256);
          await tx.wait();
          setIsApproved(true);
          toast.success(t.mining.approveSuccess);
      } catch (err: any) {
          console.error(err);
          toast.error(`${t.mining.claimFailed}: ${err.reason || err.message}`);
          // Fallback for demo
          setIsApproved(true);
      } finally {
          setTxPending(false);
      }
  };

  const handleBuyTicket = async () => {
      if (!protocolContract || !usdtContract) return;
      
      // 检查是否有过期票据
      if (isTicketExpired) {
          toast.error(t.mining.expiredTicketWarning, {
              duration: 5000,
          });
          return;
      }
      
      setTxPending(true);
      try {
          // 检查 MC 余额
          const amountWei = ethers.parseEther(selectedTicket.amount.toString());
          const mcBalance = await usdtContract.balanceOf(account);
          
          if (mcBalance < amountWei) {
              toast.error(`${t.mining.insufficientMC} ${t.mining.needsMC} ${selectedTicket.amount} USDT，${t.mining.currentBalance}: ${ethers.formatEther(mcBalance)} USDT`);
              return;
          }

          const tx = await protocolContract.buyTicket(amountWei);
          await tx.wait();
          toast.success(t.mining.ticketBuySuccess);
          // 刷新票据状态
          await checkTicketStatus();
      } catch (err: any) {
          console.error(err);
          const errorMsg = err.reason || err.message || '';
          if (errorMsg.includes('Active ticket exists')) {
              toast.error(t.mining.activeTicketExists, {
                  duration: 5000,
              });
              setHasActiveTicket(true);
              setIsTicketBought(true);
          } else if (errorMsg.includes('Invalid ticket tier')) {
              toast.error(t.mining.invalidTicketTier);
          } else {
              toast.error(`${t.mining.ticketBuyFailed}: ${errorMsg}`);
          }
      } finally {
          setTxPending(false);
      }
  };

  const handleStake = async () => {
      if (!protocolContract || !usdtContract) return;
      setTxPending(true);
      try {
          // 1. 检查 MC 余额
          const requiredAmount = ethers.parseEther(selectedTicket.requiredLiquidity.toString());
          const usdtBalance = await usdtContract.balanceOf(account);
          
          if (usdtBalance < requiredAmount) {
              toast.error(`${t.mining.insufficientUSDT} ${t.mining.needsUSDT} ${selectedTicket.requiredLiquidity} USDT，${t.mining.currentBalance}: ${ethers.formatEther(usdtBalance)} USDT`);
              return;
          }

          // 2. 检查授权
          const protocolAddr = await protocolContract.getAddress();
          const allowance = await usdtContract.allowance(account, protocolAddr);
          
          if (allowance < requiredAmount) {
              toast.error(t.mining.needApprove);
              const approveTx = await usdtContract.approve(protocolAddr, ethers.MaxUint256);
              await approveTx.wait();
              toast.success(t.mining.approveSuccess);
              return;
          }

          // 3. 执行质押
          const tx = await protocolContract.stakeLiquidity(selectedPlan.days);
          await tx.wait();

          toast.success(t.mining.stakeSuccess);
          // 刷新票据状态
          await checkTicketStatus();
      } catch (err: any) {
          console.error(t.mining.stakeFailed, err);
          const errorMsg = err.reason || err.message || '';
          
          if (errorMsg.includes('Ticket expired')) {
              toast.error(t.mining.ticketExpiredBuy, { duration: 5000 });
          } else if (errorMsg.includes('No valid ticket')) {
              toast.error(t.mining.noValidTicket);
          } else if (errorMsg.includes('Invalid cycle')) {
              toast.error(t.mining.invalidCycle);
          } else {
              toast.error(`${t.mining.stakeFailed}: ${errorMsg}`);
          }
      } finally {
          setTxPending(false);
      }
  };

  const handleClaim = async () => {
      if (!protocolContract || !desContract) return;
      setTxPending(true);
      try {
          // Check allowance for DES
          if (desAllowance < ethers.parseEther("100")) { // Just ensure enough allowance
             toast('Approving DES for Fee...', { icon: 'ℹ️' });
             const tx = await desContract.approve(await protocolContract.getAddress(), ethers.MaxUint256);
             await tx.wait();
             setDesAllowance(ethers.MaxUint256); // Optimistic update
             toast.success('DES Approved');
          }
          
          const tx = await protocolContract.claimRewards();
          await tx.wait();
          toast.success(t.mining.claimSuccess);
      } catch (err: any) {
          console.error(err);
          const errorMsg = err.reason || err.message || '';
          if (errorMsg.includes("No rewards yet")) {
            toast.error(t.mining.noRewardsYet);
          } else if (errorMsg.includes("Insufficient DES")) {
            toast.error("Insufficient DES for Fee!");
          } else {
            toast.error(`${t.mining.claimFailed}: ${errorMsg || t.mining.noRewards}`);
          }
      } finally {
          setTxPending(false);
      }
  };

  const handleRedeem = async () => {
      if (!protocolContract) return;
      setTxPending(true);
      try {
          const tx = await protocolContract.redeem();
          await tx.wait();
          toast.success(t.mining.redeemSuccess);
          setIsTicketBought(false); // Reset UI state
          setHasActiveTicket(false);
      } catch (err: any) {
          console.error(err);
          const errorMsg = err.reason || err.message || '';
          if (errorMsg.includes('Cycle not finished')) {
              toast.error(t.mining.cycleNotFinished);
          } else {
              toast.error(`${t.mining.redeemFailed}: ${errorMsg}`);
          }
      } finally {
          setTxPending(false);
      }
  };

  const handleBindReferrer = async () => {
      if (!protocolContract || !inputReferrerAddress) return;

      // 验证地址格式
      if (!ethers.isAddress(inputReferrerAddress)) {
          toast.error(t.referrer.invalidAddress);
          return;
      }

      // 检查是否绑定自己
      if (inputReferrerAddress.toLowerCase() === account?.toLowerCase()) {
          toast.error(t.referrer.cannotBindSelf);
          return;
      }

      setIsBindingReferrer(true);
      try {
          const tx = await protocolContract.bindReferrer(inputReferrerAddress);
          await tx.wait();
          toast.success(t.team.bindSuccess);
          setInputReferrerAddress('');
          // 重新检查推荐人状态
          await checkReferrerStatus();
      } catch (err: any) {
          console.error(err);
          const errorMsg = err.reason || err.message || '';
          if (errorMsg.includes('Already bound')) {
              toast.error(t.referrer.alreadyBound);
          } else {
              toast.error(`${t.referrer.bindError}: ${errorMsg}`);
          }
      } finally {
          setIsBindingReferrer(false);
      }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in">

      <div className="text-center space-y-1 md:space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-white">{t.mining.title}</h2>
        <p className="text-sm md:text-base text-slate-400">{t.mining.subtitle}</p>
      </div>

      {/* 推荐人绑定提示 - 非管理员且未绑定推荐人时显示 */}
      {isConnected && !hasReferrer && !isOwner && (
        <div className="bg-gradient-to-br from-amber-900/20 to-black/40 border border-amber-500/30 rounded-2xl p-5 md:p-6 animate-fade-in backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-start gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl shrink-0">
                <AlertCircle className="text-amber-500" size={24} />
            </div>
            
            <div className="flex-1 w-full">
              <h3 className="font-bold text-amber-400 text-lg mb-2">{t.referrer.required}</h3>
              <p className="text-sm text-amber-100/70 mb-4 leading-relaxed">
                {t.referrer.requiredDesc}
              </p>

              <div className="bg-black/40 rounded-xl p-1.5 border border-amber-500/20 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={inputReferrerAddress}
                  onChange={(e) => setInputReferrerAddress(e.target.value)}
                  placeholder={t.referrer.enterAddress}
                  className="w-full px-4 py-3 bg-transparent border-none focus:outline-none text-white text-sm placeholder:text-slate-500"
                />
                <button
                  onClick={handleBindReferrer}
                  disabled={isBindingReferrer || !inputReferrerAddress}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-lg transition-all shadow-lg shadow-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isBindingReferrer ? t.referrer.binding : t.referrer.bind}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 已绑定推荐人提示 - 显示推荐人地址 */}
      {isConnected && hasReferrer && !isOwner && referrerAddress && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <ShieldCheck className="text-green-500 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="font-bold text-green-400 mb-1">✅ {t.referrer.bound}</p>
            <p className="text-sm text-green-200/80">
              {t.referrer.yourReferrer}: <span className="font-mono font-bold text-green-300">{referrerAddress}</span>
            </p>
          </div>
        </div>
      )}

      {/* 管理员提示 */}
      {isConnected && isOwner && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <ShieldCheck className="text-purple-500 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="font-bold text-purple-400">👑 {t.referrer.adminExempt}</p>
          </div>
        </div>
      )}

      {/* 快速购买门票按钮区域 - 显眼位置 */}
      {isConnected && (hasReferrer || isOwner) && !isTicketBought && (
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-macoin-500/50 shadow-xl shadow-macoin-500/10 animate-fade-in bg-dark-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-macoin-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          <div className="text-center mb-6 relative z-10">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">🎫 {t.mining.buyTicket}</h3>
            <p className="text-slate-400">{t.mining.step1}</p>
          </div>

          <div className="space-y-3 md:space-y-4 mb-6 relative z-10">
            {TICKET_TIERS.map((tier) => (
              <div
                key={tier.amount}
                onClick={() => setSelectedTicket(tier)}
                className={`relative p-4 rounded-xl border transition-all duration-300 flex items-center justify-between cursor-pointer group ${
                  selectedTicket.amount === tier.amount
                    ? 'bg-dark-card2 border-macoin-500 shadow-lg shadow-macoin-500/20'
                    : 'bg-dark-card border-dark-border hover:border-macoin-500/30 hover:bg-dark-card2'
                }`}
              >
                {/* Left: Icon */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                        <div className="text-yellow-500 font-bold text-xl">⬢</div>
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-lg">{tier.amount} USDT Node</h4>
                        <p className="text-slate-400 text-xs">Required: {tier.requiredLiquidity} USDT Liquidity</p>
                    </div>
                </div>

                {/* Right: Button */}
                <div className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
                    selectedTicket.amount === tier.amount
                    ? 'bg-primary-gradient text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                }`}>
                    {selectedTicket.amount === tier.amount ? 'Selected' : 'Select'}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 relative z-10">
            {!isApproved ? (
              <button
                onClick={handleApprove}
                disabled={txPending}
                className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg rounded-xl transition-colors shadow-lg disabled:opacity-50"
              >
                {txPending ? t.mining.approving : `${t.mining.approve}`}
              </button>
            ) : (
              <button
                onClick={handleBuyTicket}
                disabled={txPending || isTicketExpired}
                className="w-full py-4 md:py-5 bg-primary-gradient hover:opacity-90 text-white font-extrabold text-xl rounded-xl shadow-xl shadow-purple-900/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {txPending ? t.mining.buying : `Subscribe ${selectedTicket.amount} USDT Node`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ticket Status Warnings */}
      {isTicketExpired && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="font-bold text-red-400 mb-1">⏰ {t.mining.ticketExpired}</p>
            <p className="text-sm text-red-200/80">
              {t.mining.ticketExpiredDesc}
            </p>
          </div>
        </div>
      )}
      
      {hasActiveTicket && !isTicketExpired && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="font-bold text-blue-400 mb-1">✅ {t.mining.alreadyStaked}</p>
            <p className="text-sm text-blue-200/80">
              {t.mining.alreadyStakedDesc}
            </p>
          </div>
        </div>
      )}
      
      {canStakeLiquidity && !hasActiveTicket && !isTicketExpired && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <AlertCircle className="text-green-500 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="font-bold text-green-400 mb-1">🎫 {t.mining.readyToStake}</p>
            <p className="text-sm text-green-200/80">
              {t.mining.readyToStakeDesc}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">

            {/* Left Col: Controls */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">

            {/* Step 1: Ticket - Only show if ticket is bought (read-only view) */}
            {isTicketBought && (
            <div className={`glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl relative overflow-hidden group transition-opacity bg-dark-card border border-dark-border ${(!hasReferrer && !isOwner) ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-macoin-500/10 rounded-full blur-2xl group-hover:bg-macoin-500/20 transition-all"></div>
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="p-1.5 md:p-2 bg-macoin-500/20 rounded-lg text-macoin-500">
                        <Zap size={18} className="md:w-5 md:h-5" />
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-white">{t.mining.step1} ({t.mining.completed})</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                    {TICKET_TIERS.map((tier) => (
                        <button
                            key={tier.amount}
                            disabled
                            className={`relative py-3 md:py-4 rounded-lg md:rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-0.5 md:gap-1 cursor-default ${
                                selectedTicket.amount === tier.amount
                                ? 'bg-macoin-600 text-white border-macoin-500 shadow-lg shadow-macoin-500/20 z-10'
                                : 'bg-dark-card2 border-dark-border text-slate-600 opacity-50'
                            }`}
                        >
                            <span className="text-lg md:text-xl font-bold">{tier.amount} USDT</span>
                            <span className={`text-[9px] md:text-[10px] ${selectedTicket.amount === tier.amount ? 'text-white/90' : 'text-slate-500'}`}>
                                +{tier.requiredLiquidity} {t.mining.liquidity}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            )}

            {/* Step 2: Cycle */}
            <div className={`glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl relative overflow-hidden group transition-opacity bg-dark-card border border-dark-border ${(!isTicketBought || isTicketExpired || hasActiveTicket || (!hasReferrer && !isOwner)) ? 'opacity-50 pointer-events-none' : ''}`}>
                 {!isTicketBought && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl md:rounded-2xl">
                        <div className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700">
                            <Lock size={14} className="md:w-4 md:h-4" />
                            <span className="text-xs md:text-sm font-bold">{t.mining.purchaseFirst}</span>
                        </div>
                    </div>
                )}
                 {(isTicketExpired || hasActiveTicket) && isTicketBought && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl md:rounded-2xl">
                        <div className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700">
                            <Lock size={14} className="md:w-4 md:h-4" />
                            <span className="text-xs md:text-sm font-bold">{isTicketExpired ? t.mining.ticketExpired : t.mining.alreadyStaked}</span>
                        </div>
                    </div>
                )}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="p-1.5 md:p-2 bg-blue-500/20 rounded-lg text-blue-500">
                        <Clock size={18} className="md:w-5 md:h-5" />
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-white">{t.mining.step2}</h3>
                </div>

                <div className="grid grid-cols-3 gap-2 md:gap-4">
                    {MINING_PLANS.map((plan) => (
                        <button
                            key={plan.days}
                            onClick={() => setSelectedPlan(plan)}
                            className={`p-3 md:p-4 rounded-lg md:rounded-xl border text-left transition-all duration-300 ${
                                selectedPlan.days === plan.days
                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                                : 'bg-dark-card2 border-dark-border hover:border-blue-500/50 text-slate-400'
                            }`}
                        >
                            <div className="text-xl md:text-2xl font-bold mb-0.5 md:mb-1">{plan.days} <span className="text-xs md:text-sm font-normal opacity-80">{t.mining.days}</span></div>
                            <div className={`flex items-center gap-1 text-xs md:text-sm ${selectedPlan.days === plan.days ? 'text-blue-100' : 'text-slate-500'}`}>
                                <TrendingUp size={12} className="md:w-3.5 md:h-3.5" />
                                <span>{t.mining.daily} {plan.dailyRate}%</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

             {/* Warnings */}
             <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3 md:p-4 flex items-start gap-2 md:gap-3">
                <AlertCircle className="text-orange-500 shrink-0 mt-0.5 md:w-4.5 md:h-4.5" size={16} />
                <div className="text-xs md:text-sm text-orange-200/80">
                    <p className="font-bold mb-1 text-orange-400">{t.mining.notice}</p>
                    <ul className="list-disc pl-3 md:pl-4 space-y-0.5 md:space-y-1">
                        <li>{t.mining.notice1}</li>
                        <li>{t.mining.notice2}</li>
                        <li>{t.mining.notice3}</li>
                    </ul>
                </div>
            </div>
        </div>

        {/* Right Col: Summary */}
        <div className="space-y-4 md:space-y-6">
            <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl h-full border-t-4 border-t-macoin-500 flex flex-col justify-between relative bg-dark-card border-x border-b border-dark-border">

                <div>
                    <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2 text-white">
                        <ShieldCheck className="text-macoin-500 md:w-6 md:h-6" size={20} />
                        {t.mining.estRevenue}
                    </h3>

                    <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-dark-border">
                            <span className="text-slate-400">{t.mining.ticketInv}</span>
                            <span className="font-mono text-white">{selectedTicket.amount} USDT</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-dark-border">
                            <span className="text-slate-400">{t.mining.liqInv}</span>
                            <span className="font-mono text-white">{selectedTicket.requiredLiquidity} USDT</span>
                        </div>

                         <div className="py-4 space-y-2 bg-dark-card2 -mx-2 px-2 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">{t.mining.dailyRev} ({selectedPlan.dailyRate}%)</span>
                                <span className="font-mono text-macoin-500 font-bold">~{dailyROI.toFixed(1)} USDT</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-slate-400">{t.mining.totalRev} ({selectedPlan.days} {t.mining.days})</span>
                                <div className="text-right">
                                    <div className="font-mono text-macoin-500 font-bold">~{totalROI.toFixed(1)} USDT Value</div>
                                    <div className="text-xs text-slate-500 font-mono">
                                        ({mcRewardPart.toFixed(1)} USDT + {jbcRewardAmount.toFixed(2)} ARC)
                                    </div>
                                </div>
                            </div>
                         </div>

                         <div className="bg-dark-card2 rounded-lg p-3 border border-dashed border-dark-border">
                            <div className="text-xs text-slate-500 uppercase mb-1">{t.mining.cap}</div>
                            <div className="flex justify-between items-end">
                                <span className="text-2xl font-bold text-white">{maxCap} USDT</span>
                                <span className="text-xs text-macoin-500 mb-1">{t.mining.maxCap}</span>
                            </div>
                            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2">
                                <div className="bg-macoin-500 h-1.5 rounded-full" style={{ width: '0%' }}></div>
                            </div>
                         </div>
                    </div>
                </div>

                <div className="mt-8 space-y-3">
                    {!isConnected ? (
                        <button disabled className="w-full py-3 bg-dark-card2 text-slate-500 font-bold rounded-lg cursor-not-allowed border border-dark-border">
                            {t.mining.walletNotConnected}
                        </button>
                    ) : !hasReferrer && !isOwner ? (
                        <button disabled className="w-full py-3 bg-amber-900/20 text-amber-500 font-bold rounded-lg cursor-not-allowed border border-amber-900/50">
                            ⚠️ {t.referrer.noReferrer}
                        </button>
                    ) : isCheckingAllowance ? (
                        <button
                            disabled
                            className="w-full py-3 bg-dark-card2 text-slate-400 font-bold rounded-lg cursor-wait animate-pulse border border-dark-border"
                        >
                            {t.mining.checkingAuth}
                        </button>
                    ) : !isApproved ? (
                        <button
                            onClick={handleApprove}
                            disabled={txPending}
                            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors border border-slate-600 disabled:opacity-50"
                        >
                            {txPending ? t.mining.approving : t.mining.approve}
                        </button>
                    ) : isTicketExpired ? (
                        <button
                            disabled
                            className="w-full py-4 bg-red-900/20 text-red-500 font-bold text-lg rounded-lg cursor-not-allowed border-2 border-red-900/50"
                        >
                            ⏰ {t.mining.ticketExpiredCannotBuy}
                        </button>
                    ) : !isTicketBought ? (
                        <button
                            onClick={handleBuyTicket}
                            disabled={txPending}
                            className="w-full py-4 bg-macoin-600 hover:bg-macoin-500 text-white font-extrabold text-lg rounded-lg shadow-lg shadow-macoin-500/30 transition-all disabled:opacity-50"
                        >
                            {txPending ? t.mining.buying : `🎫 ${t.mining.buyTicket}`}
                        </button>
                    ) : canStakeLiquidity ? (
                         <button
                            onClick={handleStake}
                            disabled={txPending}
                            className="w-full py-4 bg-primary-gradient hover:opacity-90 text-white font-extrabold text-lg rounded-lg shadow-lg shadow-purple-900/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50"
                         >
                            {txPending ? t.mining.staking : t.mining.stake} <ArrowRight size={20} />
                        </button>
                    ) : hasActiveTicket ? (
                        <button
                            disabled
                            className="w-full py-4 bg-blue-900/20 text-blue-500 font-bold text-lg rounded-lg cursor-not-allowed border-2 border-blue-900/50"
                        >
                            ✅ {t.mining.alreadyStaked}
                        </button>
                    ) : (
                        <button
                            disabled
                            className="w-full py-4 bg-dark-card2 text-slate-500 font-bold text-lg rounded-lg cursor-not-allowed border border-dark-border"
                        >
                            ⚠️ {t.mining.unknownStatus}
                        </button>
                    )}

                    <p className="text-xs text-center text-slate-500">
                        {t.mining.agreement}
                    </p>
                </div>

                {/* Active Mining Controls */}
                {isTicketBought && (
                    <div className="mt-4 pt-4 border-t border-dark-border flex gap-2">
                         <button
                            onClick={handleClaim}
                            disabled={txPending}
                            className="flex-1 py-2 bg-yellow-900/20 text-yellow-500 font-bold rounded-lg hover:bg-yellow-900/30 transition-colors disabled:opacity-50 flex flex-col items-center justify-center leading-tight border border-yellow-900/50"
                         >
                            <span>{t.mining.claimRewards}</span>
                            <span className="text-[10px] opacity-80">
                                Fee: {ethers.formatEther(desFeeFixed)} DES + {desFeeRate.toString()}%
                            </span>
                         </button>
                         <button
                            onClick={handleRedeem}
                            disabled={txPending}
                            className="flex-1 py-2 bg-red-900/20 text-red-500 font-bold rounded-lg hover:bg-red-900/30 transition-colors disabled:opacity-50 flex flex-col items-center justify-center leading-tight border border-red-900/50"
                         >
                            <span>{t.mining.redeem}</span>
                            <span className="text-[10px] opacity-80">
                                (Principal Only)
                            </span>
                         </button>
                    </div>
                )}

            </div>
        </div>

      </div>
    </div>
  );
};

export default MiningPanel;
