import { useState } from 'react'
import './App.css'
import RewardPage from './RewardPage'
import BuyHashratePage from './BuyHashratePage'
import { useWeb3 } from '../Web3Context'
import { ethers } from 'ethers'
import toast, { Toaster } from 'react-hot-toast'

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginLeft: 4, opacity: 0.7, verticalAlign: 'middle', cursor: 'pointer'}}>
    <path d="M20 9H11C9.89543 9 9 9.89543 9 11V20C9 21.1046 9.89543 22 11 22H20C21.1046 22 22 21.1046 22 20V11C22 9.89543 21.1046 9 20 9Z" stroke="#B0B0B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="#B0B0B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const LogoIcon = () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: 8}}>
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

import { ConnectButton } from '@rainbow-me/rainbowkit';

function App() {
  const [activeTab, setActiveTab] = useState('buy');
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <div className="app-container">
      <Toaster position="top-center" />
      {currentPage === 'reward' ? (
        <RewardPage onBack={() => setCurrentPage('home')} />
      ) : currentPage === 'buyHashrate' ? (
        <BuyHashratePage onBack={() => setCurrentPage('home')} />
      ) : (
        <>
          {/* Header */}
          <header className="header">
        <div className="header-left">
            <div className="brand">
                <LogoIcon />
                <span className="brand-name">Archimedes</span>
            </div>
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
                      <button onClick={openConnectModal} className="connect-btn">
                        链接钱包
                      </button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <button onClick={openChainModal} className="connect-btn" style={{backgroundColor: '#ff494a', background: 'none', border: '1px solid #ff494a'}}>
                        Wrong network
                      </button>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={openChainModal}
                        style={{ display: 'flex', alignItems: 'center' }}
                        type="button"
                        className="connect-btn"
                      >
                        {chain.hasIcon && (
                          <div
                            style={{
                              background: chain.iconBackground,
                              width: 12,
                              height: 12,
                              borderRadius: 999,
                              overflow: 'hidden',
                              marginRight: 4,
                            }}
                          >
                            {chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                style={{ width: 12, height: 12 }}
                              />
                            )}
                          </div>
                        )}
                        <span className="chain-name">{chain.name}</span>
                      </button>

                      <button onClick={openAccountModal} type="button" className="connect-btn">
                        {account.displayName}
                        {account.displayBalance
                          ? <span className="account-balance"> ({account.displayBalance})</span>
                          : ''}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </header>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hashrate-value">0T</div>
        <div className="hashrate-label">我的算力</div>

        <div className="hero-actions">
           <button className="buy-btn" onClick={() => setCurrentPage('buyHashrate')}>购买算力</button>
        </div>

        <div className="reward-badge" onClick={() => setCurrentPage('reward')}>奖励</div>
      </div>

      {/* Announcement */}
      <div className="announcement">
        <span className="announcement-label">公告 :</span> 暂无公告
      </div>

      {/* Stats Card */}
      <div className="card stats-card">
        <div className="stat-item">
            <div className="stat-value">0</div>
            <div className="stat-label">累计收益</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
            <div className="stat-value">0</div>
            <div className="stat-label">今日收益</div>
        </div>
      </div>

      {/* Claim Card */}
      <div className="card action-card">
        <div className="card-row">
            <span className="label-text">可领取数量 : 0</span>
            <button className="action-btn gradient-btn-1" disabled style={{opacity: 0.5}}>领取</button>
        </div>
        <div className="card-row text-muted" style={{marginTop: '12px'}}>
            <span className="small-text">不可领取数量 : 0</span>
            <span className="small-text">(手续费5DSC)</span>
        </div>
      </div>

       {/* Invite Card */}
      <div className="card action-card">
        <div className="card-row">
            <div className="invite-code">
                邀请码 : <span className="highlight-text">暂无</span> <CopyIcon />
            </div>
            <button className="action-btn gradient-btn-2">分享</button>
        </div>
        <button className="full-width-btn gradient-btn-3">团队详情</button>
      </div>

      {/* Team Info */}
      <div className="card info-card">
        <div className="info-row">
            <span className="info-label">直推下级:</span>
            <span className="info-value">0</span>
        </div>
        <div className="info-row">
            <span className="info-label">团队地址数:</span>
            <span className="info-value">0</span>
        </div>
        <div className="info-row">
            <span className="info-label">地址级别</span>
            <span className="info-value">V0</span>
        </div>
        <div className="info-row">
            <span className="info-label">上级地址</span>
            <span className="info-value text-muted">暂无</span>
        </div>
      </div>

      {/* Pool Stats */}
       <div className="card info-card">
        <div className="info-row">
            <span className="info-label">矿池总产出:</span>
            <span className="info-value">0</span>
        </div>
        <div className="info-row">
            <span className="info-label">矿池总销毁:</span>
            <span className="info-value">0</span>
        </div>
        <div className="info-row">
            <span className="info-label">全网总算力:</span>
            <span className="info-value">0</span>
        </div>
      </div>

      {/* Table Card */}
       <div className="card table-card">
        <div className="tabs">
            <span className={activeTab === 'buy' ? 'active' : ''} onClick={() => setActiveTab('buy')}>购买算力记录</span>
            <span className={activeTab === 'pool' ? 'active' : ''} onClick={() => setActiveTab('pool')}>矿池收益记录</span>
            <span className={activeTab === 'direct' ? 'active' : ''} onClick={() => setActiveTab('direct')}>直推奖励</span>
            <span className={activeTab === 'small' ? 'active' : ''} onClick={() => setActiveTab('small')}>小区奖励</span>
        </div>
        <div className="table-header">
            <span>时间</span>
            <span className="text-center">总类</span>
            <span className="text-right">金额</span>
        </div>
        <div className="table-body">
            {/* Real data is empty for now */}
            <div className="table-row" style={{justifyContent: 'center', color: '#999'}}>
                <span>暂无记录</span>
            </div>
        </div>

      </div>

      <div style={{height: '40px'}}></div>
      </>
      )}
    </div>
  )
}

export default App
