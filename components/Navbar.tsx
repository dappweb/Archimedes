import React, { useEffect, useState } from "react"
import { AppTab } from "../types"
import { Diamond, Home, Pickaxe, Users, ArrowLeftRight, Settings, PlusCircle, Globe, FileText } from "lucide-react"
import { useLanguage } from "../LanguageContext"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useWeb3 } from "../Web3Context"
import { useChainId, useSwitchChain } from "wagmi"
import iconImg from "../icon.png"

interface NavbarProps {
  currentTab: AppTab
  setTab: (tab: AppTab) => void
  walletConnected: boolean
  connectWallet: () => void
}

const Navbar: React.FC<NavbarProps> = ({ currentTab, setTab }) => {
  const { t, language, setLanguage } = useLanguage()
  const { protocolContract, account, isConnected } = useWeb3()
  const [isOwner, setIsOwner] = useState(false)

  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  useEffect(() => {
    const checkOwner = async () => {
      if (protocolContract && account) {
        try {
          const owner = await protocolContract.owner()
          setIsOwner(owner.toLowerCase() === account.toLowerCase())
        } catch (e) {
          console.error("Failed to check owner", e)
        }
      }
    }
    checkOwner()
  }, [protocolContract, account])

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-1.5 md:gap-2 cursor-pointer" onClick={() => setTab(AppTab.HOME)}>
              {currentTab !== AppTab.TEAM && (
                <div className="bg-gradient-to-tr overflow-hidden from-macoin-600 p-0 to-macoin-400 rounded-lg md:rounded-xl shadow-lg shadow-macoin-500/20">
                  {/* <Diamond size={20} className="text-white md:w-6 md:h-6" /> */}
                  <img src={iconImg} alt="" className=" w-10 md:h-10" />
                </div>
              )}
              <span className="text-lg md:text-2xl font-black text-white tracking-tight">
                Archimedes <span className="hidden sm:inline text-macoin-500">Protocol</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => setTab(AppTab.HOME)}
                className={`flex items-center gap-2 font-bold transition-colors ${
                  currentTab === AppTab.HOME ? "text-macoin-500" : "text-slate-400 hover:text-white"
                }`}
              >
                <Home size={18} /> {t.nav.home}
              </button>
              <button
                onClick={() => setTab(AppTab.MINING)}
                className={`flex items-center gap-2 font-bold transition-colors ${
                  currentTab === AppTab.MINING ? "text-macoin-500" : "text-slate-400 hover:text-white"
                }`}
              >
                <Pickaxe size={18} /> {t.nav.mining}
              </button>
              <button
                onClick={() => setTab(AppTab.TEAM)}
                className={`flex items-center gap-2 font-bold transition-colors ${
                  currentTab === AppTab.TEAM ? "text-macoin-500" : "text-slate-400 hover:text-white"
                }`}
              >
                <Users size={18} /> {t.nav.team}
              </button>
              <button
                onClick={() => setTab(AppTab.SWAP)}
                className={`flex items-center gap-2 font-bold transition-colors ${
                  currentTab === AppTab.SWAP ? "text-macoin-500" : "text-slate-400 hover:text-white"
                }`}
              >
                <ArrowLeftRight size={18} /> Swap
              </button>
              <button
                onClick={() => setTab(AppTab.HISTORY)}
                className={`flex items-center gap-2 font-bold transition-colors ${
                  currentTab === AppTab.HISTORY ? "text-macoin-500" : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText size={18} /> {t.nav.history}
              </button>
              {isOwner && (
                <button
                  onClick={() => setTab(AppTab.ADMIN)}
                  className={`flex items-center gap-2 font-bold transition-colors ${
                    currentTab === AppTab.ADMIN ? "text-macoin-500" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Settings size={18} /> Admin
                </button>
              )}
            </div>

            {/* Wallet & Language & Mobile Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switcher (Desktop & Mobile) */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
                className="p-2 rounded-lg bg-dark-card hover:bg-dark-card2 text-slate-400 hover:text-white transition-colors border border-dark-border"
                title="Switch Language"
              >
                <Globe size={18} className="md:w-5 md:h-5" />
              </button>

              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  // Note: If your app doesn't use authentication, you
                  // can remove all 'authenticationStatus' checks
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated');

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button onClick={openConnectModal} type="button" className="bg-primary-gradient text-white font-bold py-2 px-3 md:px-5 rounded-lg md:rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transition-all text-xs md:text-sm flex items-center gap-2">
                              {t.nav.connect}
                            </button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <button onClick={openChainModal} type="button" className="bg-red-500 text-white font-bold py-2 px-3 md:px-5 rounded-lg md:rounded-xl shadow-lg hover:shadow-xl transition-all text-xs md:text-sm">
                              Wrong network
                            </button>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button
                              onClick={openAccountModal}
                              type="button"
                              className="bg-dark-card border border-dark-border text-slate-200 font-bold py-2 px-3 md:px-4 rounded-lg md:rounded-xl shadow-sm hover:bg-dark-card2 transition-all text-xs md:text-sm flex items-center gap-2"
                            >
                              {account.displayName}
                              {/* {account.displayBalance
                                ? ` (${account.displayBalance})`
                                : ''} */}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Bar (Bottom) - Moved outside nav to ensure correct stacking */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 md:hidden safe-area-bottom z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-5 h-[60px] items-center">
          <button
            onClick={() => setTab(AppTab.HOME)}
            className={`flex flex-col items-center justify-center gap-1 h-full w-full ${
              currentTab === AppTab.HOME ? "text-macoin-500" : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <Home size={22} strokeWidth={currentTab === AppTab.HOME ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{t.nav.home}</span>
          </button>
          <button
            onClick={() => setTab(AppTab.MINING)}
            className={`flex flex-col items-center justify-center gap-1 h-full w-full ${
              currentTab === AppTab.MINING ? "text-macoin-500" : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <Pickaxe size={22} strokeWidth={currentTab === AppTab.MINING ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{t.nav.mining}</span>
          </button>
          <button
            onClick={() => setTab(AppTab.SWAP)}
            className="relative group"
          >
            <div className="absolute left-1/2 -translate-x-1/2 -top-6">
              <div className={`p-3 rounded-full border-4 border-[#0a0a0a] transition-all duration-300 ${
                  currentTab === AppTab.SWAP 
                  ? "bg-primary-gradient shadow-[0_0_15px_rgba(139,92,246,0.5)] scale-110" 
                  : "bg-slate-800 group-hover:bg-slate-700"
              }`}>
                <ArrowLeftRight size={24} className="text-white" />
              </div>
            </div>
            <div className={`mt-7 text-center text-[10px] font-medium transition-colors ${
              currentTab === AppTab.SWAP ? "text-macoin-500" : "text-slate-500"
            }`}>
              {t.nav.swap}
            </div>
          </button>
          <button
            onClick={() => setTab(AppTab.TEAM)}
            className={`flex flex-col items-center justify-center gap-1 h-full w-full ${
              currentTab === AppTab.TEAM ? "text-macoin-500" : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <Users size={22} strokeWidth={currentTab === AppTab.TEAM ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{t.nav.team}</span>
          </button>
          <button
            onClick={() => setTab(AppTab.HISTORY)}
            className={`flex flex-col items-center justify-center gap-1 h-full w-full ${
              currentTab === AppTab.HISTORY ? "text-macoin-500" : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <FileText size={22} strokeWidth={currentTab === AppTab.HISTORY ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{t.nav.history}</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default Navbar
