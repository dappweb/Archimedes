import { useState } from 'react'
import './RewardPage.css'

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

function RewardPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('abc');

  const records = [];

  return (
    <div className="reward-page">
      {/* Header */}
      <header className="reward-header">
        <button className="back-btn" onClick={onBack}>
          <BackIcon />
        </button>
        <h1 className="page-title">奖励</h1>
        <div style={{width: 24}}></div>
      </header>

      {/* Total Rewards */}
      <div className="total-section">
        <div className="total-amount">0</div>
        <div className="total-label">总计奖励</div>
      </div>

      {/* Stats Cards */}
      <div className="reward-stats">
        <div className="reward-stat-card">
          <div className="stat-amount">0</div>
          <div className="stat-type">ABC奖励</div>
        </div>
        <div className="reward-stat-card">
          <div className="stat-amount">0</div>
          <div className="stat-type">DSC奖励</div>
        </div>
      </div>

      {/* Claim Cards */}
      <div className="claim-card">
        <div className="claim-row">
          <span className="claim-label">可领取 (DSC) : 0</span>
          <button className="claim-btn" disabled style={{opacity: 0.5}}>领取</button>
        </div>
      </div>

      <div className="claim-card">
        <div className="claim-row">
          <span className="claim-label">可领取 (ABC) : 0</span>
          <button className="claim-btn" disabled style={{opacity: 0.5}}>领取</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="reward-tabs">
        <button
          className={`tab-btn ${activeTab === 'abc' ? 'active' : ''}`}
          onClick={() => setActiveTab('abc')}
        >
          ABC全池奖励
        </button>
        <button
          className={`tab-btn ${activeTab === 'dsc' ? 'active' : ''}`}
          onClick={() => setActiveTab('dsc')}
        >
          DSC全池奖励
        </button>
        <button
          className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          工作量奖励
        </button>
        <button
          className={`tab-btn ${activeTab === 'level' ? 'active' : ''}`}
          onClick={() => setActiveTab('level')}
        >
          平级奖励
        </button>
      </div>

      {/* Records Table */}
      <div className="records-section">
        {records.length > 0 ? records.map((record, index) => (
          <div className="record-row" key={index}>
            <span className="record-date">{record.date}</span>
            <span className="record-amount">{record.amount}</span>
          </div>
        )) : (
            <div className="record-row" style={{justifyContent: 'center', color: '#999'}}>
                <span>暂无记录</span>
            </div>
        )}
      </div>

      <div style={{height: '40px'}}></div>
    </div>
  )
}

export default RewardPage
