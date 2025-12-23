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
              <div className="bg-gradient-to-tr overflow-hidden from-macoin-600 p-0 to-macoin-400 rounded-lg md:rounded-xl shadow-lg shadow-macoin-500/20">
                {/* <Diamond size={20} className="text-white md:w-6 md:h-6" /> */}
                <img src={iconImg} alt="" className=" w-10 md:h-10" />
              </div>
              <span className="text-lg md:text-2xl font-black text-white tracking-tight">
                Archimedes <span className="text-macoin-500">Protocol</span>
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
              {/* Desktop Language Switcher */}
              <div className="hidden md:block">
                <button
                  onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
                  className="p-2 rounded-lg bg-dark-card hover:bg-dark-card2 text-slate-400 hover:text-white transition-colors border border-dark-border"
                  title="Switch Language"
                >
                  <Globe size={20} />
                </button>
              </div>

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

        {/* Mobile Navigation Bar (Bottom) */}
        <div className="fixed bottom-0 left-0 right-0 bg-dark-card/90 backdrop-blur-md border-t border-dark-border md:hidden safe-area-bottom z-50">
          <div className="grid grid-cols-5 h-16">
            <button
              onClick={() => setTab(AppTab.HOME)}
              className={`flex flex-col items-center justify-center gap-1 ${
                currentTab === AppTab.HOME ? "text-macoin-500" : "text-slate-500"
              }`}
            >
              <Home size={20} />
              <span className="text-[10px] font-medium">{t.nav.home}</span>
            </button>
            <button
              onClick={() => setTab(AppTab.MINING)}
              className={`flex flex-col items-center justify-center gap-1 ${
                currentTab === AppTab.MINING ? "text-macoin-500" : "text-slate-500"
              }`}
            >
              <Pickaxe size={20} />
              <span className="text-[10px] font-medium">{t.nav.mining}</span>
            </button>
            <button
              onClick={() => setTab(AppTab.SWAP)}
              className={`flex flex-col items-center justify-center gap-1 ${
                currentTab === AppTab.SWAP ? "text-macoin-500" : "text-slate-500"
              }`}
            >
              <div className="bg-primary-gradient p-2.5 rounded-full -mt-6 shadow-lg shadow-purple-500/30 border-4 border-dark-bg">
                <ArrowLeftRight size={22} className="text-white" />
              </div>
              <span className="text-[10px] font-medium">Swap</span>
            </button>
            <button
              onClick={() => setTab(AppTab.TEAM)}
              className={`flex flex-col items-center justify-center gap-1 ${
                currentTab === AppTab.TEAM ? "text-macoin-500" : "text-slate-500"
              }`}
            >
              <Users size={20} />
              <span className="text-[10px] font-medium">{t.nav.team}</span>
            </button>
            <button
              onClick={() => setTab(AppTab.HISTORY)}
              className={`flex flex-col items-center justify-center gap-1 ${
                currentTab === AppTab.HISTORY ? "text-macoin-500" : "text-slate-500"
              }`}
            >
              <FileText size={20} />
              <span className="text-[10px] font-medium">{t.nav.history}</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}

export default Navbar
