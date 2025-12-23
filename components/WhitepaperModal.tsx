import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface WhitepaperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhitepaperModal: React.FC<WhitepaperModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  
  if (!isOpen) return null;

  const isChinese = language === 'zh';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
                {isChinese ? '阿基米德协议白皮书' : 'Archimedes Protocol Whitepaper'}
            </h2>
            <p className="text-sm text-slate-500">
                {isChinese ? 'DeFi 4.0 • 双币持续上涨新纪元' : 'DeFi 4.0 • New Era of Dual-Token Sustainable Growth'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 sm:p-10 space-y-8 text-slate-700 leading-relaxed">
          
          {isChinese ? (
              // Chinese Content
              <>
                <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-macoin-500 pl-3">
                    一、ARC分配机制和交易规则
                    </h3>
                    <ul className="list-disc pl-5 space-y-2">
                    <li><strong>发行总量:</strong> 1亿枚 ARC</li>
                    <ul className="list-circle pl-5 mt-1 space-y-1 text-slate-600">
                        <li><strong>流动性池 (LP):</strong> 500万LP【权限全丢】</li>
                        <li><strong>流动性挖矿产出:</strong> 9500万</li>
                    </ul>
                    <li><strong>卖出滑点:</strong> 25% (25%进入黑洞地址销毁)</li>
                    <li><strong>买入滑点:</strong> 50% (50%进入黑洞地址销毁)</li>
                    <li><strong>每日通缩:</strong> ARC底池每日自动销毁1%数量</li>
                    <li><strong>卖出机制:</strong> ARC卖出时50%币量直接销毁，50%回到底池，用户拿到原交易量的金额。
                        <p className="mt-1 text-sm bg-slate-50 p-2 rounded text-slate-500 italic">
                        举例：ARC此时价格为1$，用户卖出100枚ARC，50枚ARC进入黑洞销毁地址，剩余50枚ARC回到底池，用户获得100$的USDT。
                        </p>
                    </li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-macoin-500 pl-3">
                    二、参与机制和动静态收益
                    </h3>
                    
                    <div className="mb-6">
                        <h4 className="font-bold text-slate-800 mb-2">1. 门票端分配机制</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="font-bold text-macoin-600">25%</span> 直推奖励
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="font-bold text-blue-600">15%</span> 层级奖 (推荐1-3个有效地址拿5-15层)
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="font-bold text-purple-600">25%</span> 国库资金 (黄金托底)
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="font-bold text-orange-600">25%</span> 增加底池资金厚度
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 col-span-1 sm:col-span-2">
                                <span className="font-bold text-green-600">5%</span> 市场基金 & <span className="font-bold text-red-600">5%</span> 直接进入底池购买ARC
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h4 className="font-bold text-slate-800 mb-2">2. 流动性要求</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase font-mono">
                                    <tr>
                                        <th className="p-3">门票</th>
                                        <th className="p-3">所需流动性</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr><td className="p-3 font-bold">100 USDT</td><td className="p-3">150 USDT</td></tr>
                                    <tr><td className="p-3 font-bold">300 USDT</td><td className="p-3">450 USDT</td></tr>
                                    <tr><td className="p-3 font-bold">500 USDT</td><td className="p-3">750 USDT</td></tr>
                                    <tr><td className="p-3 font-bold">1000 USDT</td><td className="p-3">1500 USDT</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h4 className="font-bold text-slate-800 mb-2">3. 提供流动性收益比例</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>7天周期:</strong> 日化 2.0%</li>
                            <li><strong>15天周期:</strong> 日化 2.5%</li>
                            <li><strong>30天周期:</strong> 日化 3.0%</li>
                        </ul>
                    </div>

                    <div className="mb-6">
                        <h4 className="font-bold text-slate-800 mb-2">4. 结算机制</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>投入:</strong> USDT</li>
                            <li><strong>产出:</strong> 50% USDT + 50% ARC</li>
                            <li><strong>说明:</strong> USDT本位结算，ARC金本位结算。</li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-macoin-500 pl-3">
                    三、购买门票和参与规则
                    </h3>
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">1. 门票购买规则</h4>
                            <p className="text-sm text-slate-600 mb-2">以100枚USDT-150枚USDT流动性为例：</p>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                                <li>用户向指定合约地址转入100枚USDT购买门票。</li>
                                <li>享受 <strong>3倍</strong> 动静态币本位收益（以购买门票USDT数量为基数）。</li>
                                <li>购买门票后需 <strong>72小时内</strong> 提供150枚USDT流动性，超时后门票自动作废。</li>
                            </ul>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">2. 提供流动性获得挖矿收益</h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                                <li>用户提供150枚USDT流动性，30天（即720小时）停止收益计算。</li>
                                <li>需支付赎回金 <strong>10%</strong>（如100USDT门票需支付10枚USDT）。</li>
                                <li>合约自动返还：流动性 + 利息(USDT+ARC) + 赎回金。</li>
                                <li>动静态收益达门票金额 <strong>3倍</strong> 出局，出局后需重新购票。</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-macoin-500 pl-3">
                    四、极差裂变机制 (V1-V9)
                    </h3>
                    <p className="mb-4">获得 5% 至 45% 的极差收益。</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase font-mono">
                                <tr>
                                    <th className="p-2">等级</th>
                                    <th className="p-2">要求有效地址数</th>
                                    <th className="p-2">极差奖励比例</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr><td className="p-2 font-bold">V1</td><td className="p-2">10</td><td className="p-2">5%</td></tr>
                                <tr><td className="p-2 font-bold">V2</td><td className="p-2">30</td><td className="p-2">10%</td></tr>
                                <tr><td className="p-2 font-bold">V3</td><td className="p-2">100</td><td className="p-2">15%</td></tr>
                                <tr><td className="p-2 font-bold">V4</td><td className="p-2">300</td><td className="p-2">20%</td></tr>
                                <tr><td className="p-2 font-bold">V5</td><td className="p-2">1,000</td><td className="p-2">25%</td></tr>
                                <tr><td className="p-2 font-bold">V6</td><td className="p-2">3,000</td><td className="p-2">30%</td></tr>
                                <tr><td className="p-2 font-bold">V7</td><td className="p-2">10,000</td><td className="p-2">35%</td></tr>
                                <tr><td className="p-2 font-bold">V8</td><td className="p-2">30,000</td><td className="p-2">40%</td></tr>
                                <tr><td className="p-2 font-bold">V9</td><td className="p-2">100,000</td><td className="p-2">45%</td></tr>
                            </tbody>
                        </table>
                        <p className="text-xs text-slate-400 mt-2">* 完整表格请参阅详细文档</p>
                    </div>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-macoin-500 pl-3">
                    四、双币燃烧持续上涨设计
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                            <h5 className="font-bold text-yellow-800 mb-2">一份投资两份收益</h5>
                            <p className="text-sm text-yellow-700">USDT + ARC 双币收益，财富双倍增长。</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                            <h5 className="font-bold text-green-800 mb-2">完全公开透明</h5>
                            <p className="text-sm text-green-700">权限全丢，链上可查，公平公正。</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <h5 className="font-bold text-blue-800 mb-2">超强长寿基因</h5>
                            <p className="text-sm text-blue-700">多保险托底 (黄金储备 + 国库)，确保长期稳定。</p>
                        </div>
                    </div>
                </section>
              </>
          ) : (
              // English Content
              <>
                <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-macoin-500 pl-3">
                    I. ARC Allocation Mechanism and Trading Rules
                    </h3>
                    <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Total Supply:</strong> 100 Million ARC</li>
                    <ul className="list-circle pl-5 mt-1 space-y-1 text-slate-600">
                        <li><strong>Liquidity Pool (LP):</strong> 5 Million (Permissions Relinquished/Burnt)</li>
                        <li><strong>Liquidity Mining Output:</strong> 95 Million</li>
                    </ul>
                    <li><strong>Sell Slippage:</strong> 25% (25% sent to Black Hole Address for burning)</li>
                    <li><strong>Buy Slippage:</strong> 50% (50% sent to Black Hole Address for burning)</li>
                    <li><strong>Daily Deflation:</strong> 1% of the ARC Liquidity Pool is automatically burnt daily.</li>
                    <li><strong>Selling Mechanism:</strong> When selling ARC, 50% of the token amount is directly burnt, and 50% returns to the pool. The user receives the USDT value equivalent to the original transaction amount.
                        <p className="mt-1 text-sm bg-slate-50 p-2 rounded text-slate-500 italic">
                        Example: If ARC price is $1 and a user sells 100 ARC: 50 ARC go to the black hole (burnt), 50 ARC return to the pool, and the user receives $100 worth of USDT.
                        </p>
                    </li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-macoin-500 pl-3">
                    II. Participation Mechanism & Dynamic/Static Rewards
                    </h3>
                    
                    <div className="mb-6">
                        <h4 className="font-bold text-slate-800 mb-2">1. Ticket Fund Allocation</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="font-bold text-macoin-600">25%</span> Direct Referral Reward
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="font-bold text-blue-600">15%</span> Level Reward (15 Layers)
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="font-bold text-purple-600">25%</span> Treasury Fund (Gold-Backed)
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="font-bold text-orange-600">25%</span> Liquidity Injection
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h4 className="font-bold text-slate-800 mb-2">2. Liquidity Requirements</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase font-mono">
                                    <tr>
                                        <th className="p-3">Ticket</th>
                                        <th className="p-3">Required Liquidity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr><td className="p-3 font-bold">100 USDT</td><td className="p-3">150 USDT</td></tr>
                                    <tr><td className="p-3 font-bold">300 USDT</td><td className="p-3">450 USDT</td></tr>
                                    <tr><td className="p-3 font-bold">500 USDT</td><td className="p-3">750 USDT</td></tr>
                                    <tr><td className="p-3 font-bold">1000 USDT</td><td className="p-3">1500 USDT</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h4 className="font-bold text-slate-800 mb-2">3. Mining Rewards & Settlement</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Cycles:</strong> 7 Days (2.0%), 15 Days (2.5%), 30 Days (3.0%)</li>
                            <li><strong>Settlement:</strong> 50% USDT (Coin-Based) + 50% ARC (Gold-Based)</li>
                            <li><strong>Redemption:</strong> 1% Fee applies. Principal + Interest returned automatically upon maturity.</li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-macoin-500 pl-3">
                    III. V-Series Differential Fission Mechanism
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase font-mono">
                                <tr>
                                    <th className="p-3">Level</th>
                                    <th className="p-3">Active Addrs</th>
                                    <th className="p-3">Reward Ratio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                <tr><td className="p-3 font-bold">V1</td><td className="p-3">10</td><td className="p-3 text-macoin-600 font-bold">5%</td></tr>
                                <tr><td className="p-3 font-bold">V2</td><td className="p-3">30</td><td className="p-3 text-macoin-600 font-bold">10%</td></tr>
                                <tr><td className="p-3 font-bold">V3</td><td className="p-3">100</td><td className="p-3 text-macoin-600 font-bold">15%</td></tr>
                                <tr><td className="p-3 font-bold">V4</td><td className="p-3">300</td><td className="p-3 text-macoin-600 font-bold">20%</td></tr>
                                <tr><td className="p-3 font-bold">V5</td><td className="p-3">1,000</td><td className="p-3 text-macoin-600 font-bold">25%</td></tr>
                                <tr><td className="p-3 font-bold">V6</td><td className="p-3">3,000</td><td className="p-3 text-macoin-600 font-bold">30%</td></tr>
                                <tr><td className="p-3 font-bold">V7</td><td className="p-3">10,000</td><td className="p-3 text-macoin-600 font-bold">35%</td></tr>
                                <tr><td className="p-3 font-bold">V8</td><td className="p-3">30,000</td><td className="p-3 text-macoin-600 font-bold">40%</td></tr>
                                <tr><td className="p-3 font-bold">V9</td><td className="p-3">100,000</td><td className="p-3 text-macoin-600 font-bold">45%</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-4 border-l-4 border-macoin-500 pl-3">
                    V. Sustainable Growth Design
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                            <h5 className="font-bold text-yellow-800 mb-2">Double Revenue</h5>
                            <p className="text-sm text-yellow-700">One investment, two types of asset returns (USDT + ARC).</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                            <h5 className="font-bold text-green-800 mb-2">Transparency</h5>
                            <p className="text-sm text-green-700">Fully open and transparent; Contract permissions relinquished.</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <h5 className="font-bold text-blue-800 mb-2">Strong Foundation</h5>
                            <p className="text-sm text-blue-700">Multi-insurance backing (Gold Reserves + Treasury).</p>
                        </div>
                    </div>
                </section>
              </>
          )}

        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
            >
                {isChinese ? '关闭' : 'Close'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default WhitepaperModal;
