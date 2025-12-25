import React, { useState, useEffect } from 'react';
import { TEAM_LEVELS } from '../constants';
import { Crown, Users, Percent, UserCheck, Copy, Share2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useWeb3 } from '../Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

interface DirectReferral {
    user: string;
    ticketAmount: bigint;
    joinTime: bigint;
}

const TeamLevel: React.FC = () => {
  const { t } = useLanguage();
  const { protocolContract, account, isConnected } = useWeb3();
  const [userLevelInfo, setUserLevelInfo] = useState({
      activeDirects: 0,
      teamCount: 0,
      currentLevel: 'V0'
  });
  const [directReferrals, setDirectReferrals] = useState<DirectReferral[]>([]);
  const [isLoadingDirects, setIsLoadingDirects] = useState(false);

  // Calculate total ticket amount from direct referrals
  const totalTicketAmount = directReferrals.reduce((acc, curr) => acc + curr.ticketAmount, 0n);

  const copyReferralLink = () => {
      if (account) {
          const url = `${window.location.origin}?ref=${account}`;
          
          // Try modern clipboard API first
          if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(url)
                  .then(() => toast.success(t.team.referralLinkCopied))
                  .catch(() => fallbackCopy(url));
          } else {
              // Fallback for older browsers or non-HTTPS
              fallbackCopy(url);
          }
      } else {
          toast.error(t.team.connectWalletFirst);
      }
  };

  const fallbackCopy = (text: string) => {
      try {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast.success(t.team.referralLinkCopied);
      } catch (err) {
          console.error('Failed to copy:', err);
          toast.error(t.team.failedToCopy);
      }
  };

  useEffect(() => {
    const fetchTeamInfo = async () => {
        if (isConnected && account && protocolContract) {
            try {
                const userInfo = await protocolContract.userInfo(account);
                // userInfo: (referrer, activeDirects, teamCount, totalRevenue, currentCap, isActive)

                // Calc Level
                const activeDirects = Number(userInfo[1]);
                let level = "V0";
                if (activeDirects >= 100000) level = "V9";
                else if (activeDirects >= 30000) level = "V8";
                else if (activeDirects >= 10000) level = "V7";
                else if (activeDirects >= 3000) level = "V6";
                else if (activeDirects >= 1000) level = "V5";
                else if (activeDirects >= 300) level = "V4";
                else if (activeDirects >= 100) level = "V3";
                else if (activeDirects >= 30) level = "V2";
                else if (activeDirects >= 10) level = "V1";

                setUserLevelInfo({
                    activeDirects: activeDirects,
                    teamCount: Number(userInfo[2]),
                    currentLevel: level
                });

                // Fetch Direct Referrals
                setIsLoadingDirects(true);
                try {
                    // This function was added to the contract in the latest update
                    // Returns array of structs: (user, ticketAmount, joinTime)
                    const data = await protocolContract.getDirectReferralsData(account);
                    // data is a Result object that behaves like an array of Results
                    const formattedData: DirectReferral[] = data.map((item: any) => ({
                        user: item.user,
                        ticketAmount: item.ticketAmount,
                        joinTime: item.joinTime
                    }));
                    setDirectReferrals(formattedData);
                } catch (e) {
                    console.error("Failed to fetch directs", e);
                } finally {
                    setIsLoadingDirects(false);
                }

            } catch (err) {
                console.error("Failed to fetch team info", err);
            }
        }
    };
    fetchTeamInfo();
  }, [isConnected, account, protocolContract]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-fade-in">
       <div className="text-center space-y-1 md:space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-white">{t.team.title}</h2>
        <p className="text-sm md:text-base text-slate-400">{t.team.subtitle}</p>
      </div>

      <div className="glass-panel rounded-xl md:rounded-2xl overflow-hidden border border-dark-border bg-dark-card">
        <div className="p-4 md:p-6 border-b border-dark-border flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 justify-between items-start sm:items-center bg-dark-card2">
            <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-200">{t.team.current}: <span className="text-macoin-400">{userLevelInfo.currentLevel}</span></h3>
                <p className="text-xs md:text-sm text-slate-400">
                    {t.team.colCount}: {userLevelInfo.activeDirects} | {t.team.colReward}: {TEAM_LEVELS.find(l => l.level === userLevelInfo.currentLevel)?.reward || '0%'}
                </p>
            </div>
            <div className="px-3 md:px-4 py-1.5 md:py-2 bg-dark-card rounded-lg border border-dark-border shadow-sm">
                <span className="text-xs md:text-sm text-slate-400">{t.team.teamCount}:</span>
                <span className="ml-2 font-bold text-white">{userLevelInfo.teamCount}</span>
            </div>
        </div>

        <div className="overflow-x-auto px-4 -mx-4 sm:mx-0">
            <table className="w-full text-left min-w-[600px] sm:min-w-0 border-collapse">
                <thead>
                    <tr className="bg-dark-card2/50 border-b border-dark-border/50">
                        <th className="p-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">{t.team.colLevel}</th>
                        <th className="p-4 text-slate-400 font-semibold text-xs uppercase tracking-wider text-center">{t.team.colCount}</th>
                        <th className="p-4 text-slate-400 font-semibold text-xs uppercase tracking-wider text-center">{t.team.colReward}</th>
                        <th className="p-4 text-slate-400 font-semibold text-xs uppercase tracking-wider text-right">{t.team.colStatus}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/30">
                    {TEAM_LEVELS.map((level, index) => {
                        const isCurrent = level.level === userLevelInfo.currentLevel;
                        // Calculate progress towards next level if not current
                        const isActive = userLevelInfo.activeDirects >= level.countRequired;
                        
                        return (
                            <tr 
                                key={level.level} 
                                className={`group transition-all duration-300 ${
                                    isCurrent 
                                    ? 'bg-macoin-500/10 hover:bg-macoin-500/15' 
                                    : 'hover:bg-white/5'
                                }`}
                            >
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                                            index >= 6 ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 text-yellow-400 border border-yellow-500/30' : 
                                            isCurrent ? 'bg-gradient-to-br from-macoin-500 to-macoin-700 text-white shadow-macoin-500/30' : 
                                            'bg-dark-card2 text-slate-500 border border-dark-border'
                                        }`}>
                                            {index >= 6 ? <Crown size={20} weight="fill" /> : <span className="font-bold font-mono">{level.level}</span>}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                                                {level.desc || `${t.team.levelReward} ${level.level}`}
                                            </span>
                                            {isCurrent && <span className="text-[10px] text-macoin-400 font-medium uppercase tracking-wider">{t.team.currentPlan}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="inline-flex flex-col items-center">
                                        <span className={`font-mono font-bold text-lg ${isActive ? 'text-green-400' : 'text-slate-500'}`}>
                                            {level.countRequired}
                                        </span>
                                        <span className="text-[10px] text-slate-500 uppercase">{t.team.activeUsers}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                                        isCurrent 
                                        ? 'bg-macoin-500 text-white shadow-lg shadow-macoin-500/20' 
                                        : 'bg-dark-card2 text-slate-400 border border-dark-border'
                                    }`}>
                                        {level.reward}%
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    {isCurrent ? (
                                        <div className="flex items-center justify-end gap-2 text-macoin-400">
                                            <div className="w-2 h-2 rounded-full bg-macoin-500 animate-pulse"></div>
                                            <span className="font-bold text-sm uppercase tracking-wider">{t.team.current}</span>
                                        </div>
                                    ) : isActive ? (
                                        <span className="text-green-500 text-xs font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                            {t.team.unlocked}
                                        </span>
                                    ) : (
                                        <span className="text-slate-600 text-xs font-medium uppercase tracking-wider flex items-center justify-end gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                                            {t.team.locked}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* Direct Referrals Network Section */}
      <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl bg-dark-card border border-dark-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 md:mb-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-900/20 text-purple-400 rounded-full">
                    <UserCheck size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">{t.team.networkTitle}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        {t.team.networkSubtitle}
                        {account && (
                            <button onClick={copyReferralLink} className="text-macoin-400 hover:text-macoin-300 font-bold flex items-center gap-1 ml-2">
                                <Copy size={12} /> {t.team.link}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{t.team.netTotalAmount}</p>
                <p className="text-xl font-black text-purple-400 font-mono">
                    {ethers.formatEther(totalTicketAmount)} <span className="text-sm font-bold text-purple-600">USDT</span>
                </p>
            </div>
        </div>

        {isLoadingDirects ? (
            <div className="text-center py-8 text-slate-500">{t.team.networkLoading}</div>
        ) : directReferrals.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-dark-card2 border-b border-dark-border">
                            <th className="p-4 text-slate-400 text-sm font-semibold">{t.team.netWallet}</th>
                            <th className="p-4 text-slate-400 text-sm font-semibold whitespace-nowrap">{t.team.netTicket}</th>
                            <th className="p-4 text-slate-400 text-sm font-semibold whitespace-nowrap">{t.team.netStatus}</th>
                            <th className="p-4 text-slate-400 text-sm font-semibold text-right whitespace-nowrap">{t.team.netJoined}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border">
                        {directReferrals.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 text-slate-300 font-mono text-sm">
                                    {item.user.substring(0, 6)}...{item.user.substring(38)}
                                </td>
                                <td className="p-4 text-slate-300 font-bold text-sm whitespace-nowrap">
                                    {ethers.formatEther(item.ticketAmount)} USDT
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full whitespace-nowrap ${item.ticketAmount > 0n ? 'bg-green-900/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                                        {item.ticketAmount > 0n ? t.team.netActive : t.team.inactive}
                                    </span>
                                </td>
                                <td className="p-4 text-right text-slate-500 text-sm whitespace-nowrap">
                                    {item.joinTime > 0n ? new Date(Number(item.joinTime) * 1000).toLocaleDateString() : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="text-center py-12 bg-dark-card2 rounded-xl border border-dashed border-dark-border">
                <Users className="mx-auto text-slate-600 mb-2" size={32} />
                <p className="text-slate-400 font-medium">{t.team.netNone}</p>
                <button 
                    onClick={copyReferralLink}
                    className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 bg-macoin-900/30 text-macoin-400 rounded-lg hover:bg-macoin-900/50 transition-colors font-bold text-sm border border-macoin-500/30"
                >
                    <Share2 size={16} />
                    {t.team.netShare}
                </button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl bg-dark-card border border-dark-border">
                <h3 className="text-base md:text-lg font-bold text-white mb-2">{t.team.directReward}</h3>
                <div className="text-3xl md:text-4xl font-bold text-macoin-400 mb-2">25%</div>
                <p className="text-slate-400 text-xs md:text-sm">
                    {t.team.directDesc}
                </p>
            </div>
            <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl bg-dark-card border border-dark-border">
                <h3 className="text-base md:text-lg font-bold text-white mb-2">{t.team.levelReward}</h3>
                <ul className="space-y-2 text-xs md:text-sm text-slate-400">
                    <li className="flex justify-between border-b border-dark-border pb-1">
                        <span>{t.team.l1}</span>
                        <span className="text-slate-200">{t.team.r1}</span>
                    </li>
                    <li className="flex justify-between border-b border-dark-border pb-1">
                        <span>{t.team.l2}</span>
                        <span className="text-slate-200">{t.team.r2}</span>
                    </li>
                    <li className="flex justify-between">
                        <span>{t.team.l3}</span>
                        <span className="text-slate-200">{t.team.r3}</span>
                    </li>
                </ul>
            </div>
      </div>
    </div>
  );
};

export default TeamLevel;