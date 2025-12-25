import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../Web3Context';
import { Settings, Save, AlertTriangle, Megaphone, Users, Shield, Lock, TrendingUp } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const AdminPanel: React.FC = () => {
  const { t } = useLanguage();
  const { protocolContract, isConnected, provider, usdtContract, arcContract } = useWeb3();
  const [loading, setLoading] = useState(false);

  // Wallets
  const [marketingWallet, setMarketingWallet] = useState(''); // Acts as Platform Wallet
  const [lpWallet, setLpWallet] = useState('');

  // User Management
  const [targetUser, setTargetUser] = useState('');
  const [newReferrer, setNewReferrer] = useState('');
  const [activeDirects, setActiveDirects] = useState('');
  const [teamCount, setTeamCount] = useState('');

  // Whitelist & Office
  const [whitelistAddr, setWhitelistAddr] = useState('');
  const [officeAddr, setOfficeAddr] = useState('');

  // Announcement Management
  const [announceZh, setAnnounceZh] = useState('');
  const [announceEn, setAnnounceEn] = useState('');

  // Load current announcements
  useEffect(() => {
    const storedAnnouncements = localStorage.getItem('announcements');
    if (storedAnnouncements) {
      try {
        const announcements = JSON.parse(storedAnnouncements);
        setAnnounceZh(announcements.zh || '');
        setAnnounceEn(announcements.en || '');
      } catch (err) {
        console.error('Failed to load announcements', err);
      }
    }
  }, []);

  // Liquidity Management
  const [usdtLiquidityAmount, setUsdtLiquidityAmount] = useState('');
  const [arcLiquidityAmount, setArcLiquidityAmount] = useState('');

  const publishAnnouncement = () => {
    try {
      const announcements = {
        zh: announceZh,
        en: announceEn
      };
      localStorage.setItem('announcements', JSON.stringify(announcements));
      toast.success(t.admin.announcementSuccess);

      // 触发 NoticeBar 更新（通过 storage 事件）
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Failed to publish announcement', err);
      toast.error(t.admin.failedPublish);
    }
  };

  const clearAnnouncement = () => {
    try {
      localStorage.removeItem('announcements');
      setAnnounceZh('');
      setAnnounceEn('');
      toast.success(t.admin.announcementCleared);

      // 触发 NoticeBar 更新
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Failed to clear announcement', err);
      toast.error(t.admin.failedClear);
    }
  };

  const updateWallets = async () => {
    if (!protocolContract) return;
    setLoading(true);
    try {
        if (!marketingWallet || !lpWallet) {
            toast.error(t.admin.walletRequired);
            return;
        }
      const tx = await protocolContract.setWallets(marketingWallet, lpWallet);
      await tx.wait();
      toast.success(t.admin.success);
    } catch (err: any) {
      toast.error(t.admin.failed + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const updateUserStats = async () => {
    if (!protocolContract || !targetUser) return;
    setLoading(true);
    try {
        const tx = await protocolContract.adminSetUserStats(targetUser, activeDirects, teamCount);
        await tx.wait();
        toast.success(t.admin.success);
    } catch (err: any) {
        toast.error(t.admin.failed + (err.reason || err.message));
    } finally {
        setLoading(false);
    }
  };

  const updateReferrer = async () => {
    if (!protocolContract || !targetUser || !newReferrer) return;
    setLoading(true);
    try {
        const tx = await protocolContract.adminSetReferrer(targetUser, newReferrer);
        await tx.wait();
        toast.success(t.admin.success);
    } catch (err: any) {
        toast.error(t.admin.failed + (err.reason || err.message));
    } finally {
        setLoading(false);
    }
  };

  const handleSetWhitelist = async (status: boolean) => {
    if (!protocolContract || !whitelistAddr) return;
    setLoading(true);
    try {
        const tx = await protocolContract.setWhitelist(whitelistAddr, status);
        await tx.wait();
        toast.success(status ? t.admin.whitelistAdded : t.admin.whitelistRemoved);
        setWhitelistAddr('');
    } catch (e: any) {
        toast.error(t.admin.failed + (e.reason || e.message));
    } finally {
        setLoading(false);
    }
  };

  const handleSetOffice = async (status: boolean) => {
    if (!protocolContract || !officeAddr) return;
    setLoading(true);
    try {
        const tx = await protocolContract.setCommunityOffice(officeAddr, status);
        await tx.wait();
        toast.success(status ? t.admin.officeSet : t.admin.officeRemoved);
        setOfficeAddr('');
    } catch (e: any) {
        toast.error(t.admin.failed + (e.reason || e.message));
    } finally {
        setLoading(false);
    }
  };

  const addLiquidity = async (tokenType: 'USDT' | 'ARC') => {
    if (!isConnected || !provider) {
        toast.error(t.admin.connectWallet);
        return;
    }

    setLoading(true);
    try {
        const signer = await provider.getSigner();

        if (tokenType === 'USDT' && usdtLiquidityAmount) {
            const amount = ethers.parseEther(usdtLiquidityAmount);

            if (!usdtContract) {
                toast.error(t.admin.usdtNotFound);
                return;
            }

            // Transfer USDT to protocol contract
            const tx = await usdtContract.connect(signer).transfer(CONTRACT_ADDRESSES.PROTOCOL, amount);
            await tx.wait();
            toast.success(t.admin.addedLiquidity.replace('{amount}', usdtLiquidityAmount).replace('{token}', 'USDT'));
            setUsdtLiquidityAmount('');
        } else if (tokenType === 'ARC' && arcLiquidityAmount) {
            const amount = ethers.parseEther(arcLiquidityAmount);

            if (!arcContract) {
                toast.error(t.admin.arcNotFound);
                return;
            }

            // Transfer ARC to protocol contract
            const tx = await arcContract.connect(signer).transfer(CONTRACT_ADDRESSES.PROTOCOL, amount);
            await tx.wait();
            toast.success(t.admin.addedLiquidity.replace('{amount}', arcLiquidityAmount).replace('{token}', 'ARC'));
            setArcLiquidityAmount('');
        }
    } catch (err: any) {
        console.error(err);
        toast.error(t.admin.failed + (err.reason || err.message));
    } finally {
        setLoading(false);
    }
  };

  // Daily Settlement
  const [settlementInput, setSettlementInput] = useState('');
  
  const handleDailySettlement = async () => {
      if (!protocolContract || !settlementInput) return;
      setLoading(true);
      try {
          // Parse Input: "address1,amount1\naddress2,amount2"
          const lines = settlementInput.split('\n').map(l => l.trim()).filter(l => l);
          const users: string[] = [];
          const amounts: bigint[] = [];

          for (const line of lines) {
              const [user, amountStr] = line.split(/[,\t]+/).map(s => s.trim());
              if (ethers.isAddress(user) && amountStr) {
                  users.push(user);
                  amounts.push(ethers.parseEther(amountStr));
              }
          }

          if (users.length === 0) {
              toast.error("No valid data found");
              return;
          }

          const tx = await protocolContract.distributeDailyRewards(users, amounts);
          await tx.wait();
          toast.success(`Distributed rewards to ${users.length} users`);
          setSettlementInput('');
      } catch (err: any) {
          console.error(err);
          toast.error("Distribution failed: " + (err.reason || err.message));
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-20">
      <div className="text-center space-y-1 md:space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-2">
            <Settings className="text-red-400 md:w-7 md:h-7" size={24} /> {t.admin.title}
        </h2>
        <p className="text-sm md:text-base text-slate-400">{t.admin.subtitle}</p>
      </div>

      {/* Announcement Management */}
      <div className="glass-panel p-6 md:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-yellow-900/10 to-orange-900/10 border-2 border-yellow-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-900/20 rounded-lg">
            <Megaphone className="text-yellow-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white">{t.admin.announcement}</h3>
            <p className="text-sm text-slate-400">{t.admin.announcementDesc}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">{t.admin.announcementZh}</label>
            <textarea
              value={announceZh}
              onChange={(e) => setAnnounceZh(e.target.value)}
              placeholder={t.admin.announcementPlaceholder}
              rows={3}
              className="w-full px-4 py-3 border-2 border-dark-border bg-dark-card2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">{t.admin.announcementEn}</label>
            <textarea
              value={announceEn}
              onChange={(e) => setAnnounceEn(e.target.value)}
              placeholder={t.admin.announcementPlaceholder}
              rows={3}
              className="w-full px-4 py-3 border-2 border-dark-border bg-dark-card2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={publishAnnouncement}
              disabled={!announceZh && !announceEn}
              className="flex-1 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {t.admin.publishAnnouncement}
            </button>
            <button
              onClick={clearAnnouncement}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-lg transition-colors"
            >
              {t.admin.clearAnnouncement}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Whitelist Management */}
          <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl bg-dark-card border border-dark-border">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <Shield className="text-slate-400" size={20} />
                  <h3 className="text-lg md:text-xl font-bold text-slate-200">{t.admin.whitelistManager}</h3>
              </div>
              <div className="space-y-3">
                  <input 
                      type="text" 
                      value={whitelistAddr} 
                      onChange={e => setWhitelistAddr(e.target.value)} 
                      className="w-full p-2 border border-dark-border bg-dark-card2 text-white rounded text-sm font-mono focus:outline-none focus:border-macoin-500" 
                      placeholder={t.admin.userAddressPlaceholder}
                  />
                  <div className="flex gap-2">
                      <button 
                          onClick={() => handleSetWhitelist(true)} 
                          disabled={loading || !whitelistAddr} 
                          className="flex-1 py-2 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50 transition-colors"
                      >
                          {t.admin.addWhitelist}
                      </button>
                      <button 
                          onClick={() => handleSetWhitelist(false)} 
                          disabled={loading || !whitelistAddr} 
                          className="flex-1 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50 transition-colors"
                      >
                          {t.admin.remove}
                      </button>
                  </div>
              </div>
          </div>

          {/* Office Management */}
          <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl bg-dark-card border border-dark-border">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <Users className="text-slate-400" size={20} />
                  <h3 className="text-lg md:text-xl font-bold text-slate-200">{t.admin.communityOffice}</h3>
              </div>
              <div className="space-y-3">
                  <input 
                      type="text" 
                      value={officeAddr} 
                      onChange={e => setOfficeAddr(e.target.value)} 
                      className="w-full p-2 border border-dark-border bg-dark-card2 text-white rounded text-sm font-mono focus:outline-none focus:border-macoin-500" 
                      placeholder={t.admin.officeAddressPlaceholder}
                  />
                  <div className="flex gap-2">
                      <button 
                          onClick={() => handleSetOffice(true)} 
                          disabled={loading || !officeAddr} 
                          className="flex-1 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50 transition-colors"
                      >
                          {t.admin.setOffice}
                      </button>
                      <button 
                          onClick={() => handleSetOffice(false)} 
                          disabled={loading || !officeAddr} 
                          className="flex-1 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50 transition-colors"
                      >
                          {t.admin.remove}
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* Daily Settlement (New) */}
      <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl bg-dark-card border border-dark-border">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Megaphone className="text-slate-400" size={20} />
              <h3 className="text-lg md:text-xl font-bold text-slate-200">Daily Rewards Distribution</h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">Format: address,amount (one per line). Amount in ARC (Ether unit).</p>
          <textarea
              value={settlementInput}
              onChange={(e) => setSettlementInput(e.target.value)}
              className="w-full h-32 p-3 bg-dark-card2 border border-dark-border rounded-lg text-white font-mono text-xs mb-3 focus:outline-none focus:border-macoin-500"
              placeholder={`0x123...abc, 100\n0x456...def, 50.5`}
          />
          <button
              onClick={handleDailySettlement}
              disabled={loading || !settlementInput}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
              Distribute Rewards
          </button>
      </div>

      {/* Wallet Addresses */}
      <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl bg-dark-card border border-dark-border">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-slate-200">{t.admin.wallets}</h3>
          <div className="space-y-3 md:space-y-4">
              <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-1">{t.admin.platformWallet}</label>
                  <input type="text" value={marketingWallet} onChange={e => setMarketingWallet(e.target.value)} className="w-full p-2 md:p-2.5 border border-dark-border bg-dark-card2 text-white rounded text-xs md:text-sm font-mono focus:outline-none focus:border-macoin-500" placeholder="0x..." />
              </div>
              <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-1">{t.admin.lpWallet}</label>
                  <input type="text" value={lpWallet} onChange={e => setLpWallet(e.target.value)} className="w-full p-2 md:p-2.5 border border-dark-border bg-dark-card2 text-white rounded text-xs md:text-sm font-mono focus:outline-none focus:border-macoin-500" placeholder="0x..." />
              </div>
              <button onClick={updateWallets} disabled={loading} className="w-full py-2 md:py-2.5 bg-macoin-600 text-white rounded-lg mt-2 hover:bg-macoin-700 disabled:opacity-50 text-sm md:text-base transition-colors">
                  {t.admin.updateWallets}
              </button>
          </div>
      </div>

      {/* User Management */}
      <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl bg-dark-card border border-dark-border">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-slate-200">{t.admin.userMgmt}</h3>
          <div className="space-y-3 md:space-y-4">
              <div>
                  <label className="block text-xs md:text-sm text-slate-400 mb-1">{t.admin.userAddr}</label>
                  <input type="text" value={targetUser} onChange={e => setTargetUser(e.target.value)} className="w-full p-2 md:p-2.5 border border-dark-border bg-dark-card2 text-white rounded text-xs md:text-sm font-mono focus:outline-none focus:border-macoin-500" placeholder="0x..." />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 border-t border-dark-border pt-3 md:pt-4">
                  <div>
                      <label className="block text-xs md:text-sm text-slate-400 mb-1">{t.admin.newReferrer}</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                          <input type="text" value={newReferrer} onChange={e => setNewReferrer(e.target.value)} className="w-full p-2 md:p-2.5 border border-dark-border bg-dark-card2 text-white rounded text-xs md:text-sm font-mono focus:outline-none focus:border-macoin-500" placeholder="0x..." />
                          <button onClick={updateReferrer} disabled={loading} className="px-3 md:px-4 py-2 md:py-2.5 bg-macoin-600 text-white rounded hover:bg-macoin-700 disabled:opacity-50 text-xs md:text-sm whitespace-nowrap transition-colors">
                              {t.admin.updateReferrer}
                          </button>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                          <label className="text-xs md:text-sm text-slate-400 w-20 md:w-24">{t.admin.activeDirects}</label>
                          <input type="number" value={activeDirects} onChange={e => setActiveDirects(e.target.value)} className="w-full p-2 md:p-2.5 border border-dark-border bg-dark-card2 text-white rounded text-xs md:text-sm focus:outline-none focus:border-macoin-500" />
                      </div>
                      <div className="flex gap-2 items-center">
                          <label className="text-xs md:text-sm text-slate-400 w-20 md:w-24">{t.admin.teamCount}</label>
                          <input type="number" value={teamCount} onChange={e => setTeamCount(e.target.value)} className="w-full p-2 md:p-2.5 border border-dark-border bg-dark-card2 text-white rounded text-xs md:text-sm focus:outline-none focus:border-macoin-500" />
                      </div>
                      <button onClick={updateUserStats} disabled={loading} className="w-full py-2 md:py-2.5 bg-macoin-600 text-white rounded hover:bg-macoin-700 disabled:opacity-50 text-xs md:text-sm transition-colors">
                          {t.admin.updateUser}
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* Liquidity Management */}
      <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl bg-dark-card border border-red-500/30">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
              <AlertTriangle className="text-red-400" size={20} />
              <h3 className="text-lg md:text-xl font-bold text-slate-200">{t.admin.addPoolLiquidity}</h3>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mb-4">{t.admin.liquidityDesc}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">{t.admin.addUSDTLiquidity}</label>
                  <input 
                      type="number" 
                      value={usdtLiquidityAmount} 
                      onChange={e => setUsdtLiquidityAmount(e.target.value)} 
                      className="w-full p-2 md:p-2.5 border border-dark-border bg-dark-card2 text-white rounded text-sm focus:outline-none focus:border-macoin-500"
                      placeholder={t.admin.amountUSDT}
                  />
                  <button 
                      onClick={() => addLiquidity('USDT')} 
                      disabled={loading || !usdtLiquidityAmount}
                      className="w-full py-2 md:py-2.5 bg-macoin-600 text-white rounded-lg hover:bg-macoin-700 disabled:opacity-50 text-sm md:text-base transition-colors"
                  >
                      {t.admin.addUSDTPool}
                  </button>
              </div>
              
              <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">{t.admin.addARCLiquidity}</label>
                  <input 
                      type="number" 
                      value={arcLiquidityAmount} 
                      onChange={e => setArcLiquidityAmount(e.target.value)} 
                      className="w-full p-2 md:p-2.5 border border-dark-border bg-dark-card2 text-white rounded text-sm focus:outline-none focus:border-macoin-500"
                      placeholder={t.admin.amountARC}
                  />
                  <button 
                      onClick={() => addLiquidity('ARC')} 
                      disabled={loading || !arcLiquidityAmount}
                      className="w-full py-2 md:py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm md:text-base transition-colors"
                  >
                      {t.admin.addARCPool}
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AdminPanel;
