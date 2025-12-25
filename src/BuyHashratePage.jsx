import { useState } from 'react'
import './BuyHashratePage.css'

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 6H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 18H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
  const hashratePlans = [
    {
      id: 1,
      title: '初始算力',
      hashrate: '1180T=1.83T',
      price: 3000,
      power: '1380T'
    },
    {
      id: 2,
      title: '至尊节点',
      hashrate: '1380U',
      price: 'A级36倍DSC',
      power: '1380T'
    },
    {
      id: 3,
      title: '超级节点',
      hashrate: '1380U',
      price: 'A级36倍DSC',
      power: '1380T'
    }
  ];

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
        <button className="menu-btn">
          <MenuIcon />
        </button>
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
                <p className="plan-price">价格：{plan.price}</p>
              ) : (
                <p className="plan-price">{plan.price}</p>
              )}
              <p className="plan-power">初始算力：{plan.power}</p>
            </div>
            <button className="plan-buy-btn">认购</button>
          </div>
        ))}
      </div>

      <div style={{height: '40px'}}></div>
    </div>
  )
}

export default BuyHashratePage
