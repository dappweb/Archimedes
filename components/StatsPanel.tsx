import React, { useEffect, useState } from "react"
import { UserStats } from "../types"
import { Wallet, TrendingUp, Users, Coins, ArrowUpRight, Link } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useLanguage } from "../LanguageContext"
import { useWeb3 } from "../Web3Context"
import { ethers } from "ethers"
import toast from "react-hot-toast"

interface StatsPanelProps {
  stats: UserStats
  onJoinClick: () => void
  onWhitepaperClick: () => void
}

// This will be replaced with real price history data from blockchain

const StatsPanel: React.FC<StatsPanelProps> = ({ stats: initialStats, onJoinClick, onWhitepaperClick }) => {
  const { t } = useLanguage()
  const { usdtContract, arcContract, protocolContract, account, isConnected, provider } = useWeb3()
  const [displayStats, setDisplayStats] = useState<UserStats>(initialStats)
  const [arcPrice, setArcPrice] = useState<string>("1.0")

  // Bind Referrer State
  const [referrer, setReferrer] = useState("")
  const [isBound, setIsBound] = useState(false)
  const [isBinding, setIsBinding] = useState(false)

  // Price History State
  const [priceHistory, setPriceHistory] = useState<Array<{ name: string; uv: number }>>([])
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  // Fetch Price History from Swap Events
  useEffect(() => {
    const fetchPriceHistory = async () => {
      if (!protocolContract || !provider) {
        setLoadingPriceHistory(false)
        return
      }

      try {
        setLoadingPriceHistory(true)
        setFetchError(false)
        const currentBlock = await provider.getBlockNumber()
        const fromBlock = Math.max(0, currentBlock - 100000) // Last ~100k blocks

        // Query both swap events
        const [mcToJbcEvents, jbcToMcEvents] = await Promise.all([
          protocolContract.queryFilter(protocolContract.filters.SwappedMCToJBC(), fromBlock),
          protocolContract.queryFilter(protocolContract.filters.SwappedJBCToMC(), fromBlock),
        ])

        // Combine and parse swap events to calculate prices
        interface PricePoint {
          timestamp: number
          price: number
        }

        const pricePoints: PricePoint[] = []

        // Parse USDT->ARC swaps: price = usdtAmount / arcAmount
        for (const event of usdtToArcEvents) {
          try {
            const block = await provider.getBlock(event.blockNumber)
            if (event.args && block) {
              const usdtAmount = parseFloat(ethers.formatEther(event.args[1]))
              const arcAmount = parseFloat(ethers.formatEther(event.args[2]))
              if (arcAmount > 0) {
                const price = usdtAmount / arcAmount
                pricePoints.push({
                  timestamp: block.timestamp,
                  price: price,
                })
              }
            }
          } catch (err) {
            console.error("Error parsing MC->JBC event:", err)
          }
        }

        // Parse JBC->MC swaps: price = mcAmount / jbcAmount
        for (const event of jbcToMcEvents) {
          try {
            const block = await provider.getBlock(event.blockNumber)
            if (event.args && block) {
              const jbcAmount = parseFloat(ethers.formatEther(event.args[1]))
              const mcAmount = parseFloat(ethers.formatEther(event.args[2]))
              if (jbcAmount > 0) {
                const price = mcAmount / jbcAmount
                pricePoints.push({
                  timestamp: block.timestamp,
                  price: price,
                })
              }
            }
          } catch (err) {
            console.error("Error parsing JBC->MC event:", err)
          }
        }

        // Sort by timestamp
        pricePoints.sort((a, b) => a.timestamp - b.timestamp)

        if (pricePoints.length === 0) {
          // No swap data yet, use default initial price
          setPriceHistory([{ name: "Now", uv: 1.0 }])
          setLoadingPriceHistory(false)
          return
        }

        // Aggregate prices into time buckets for chart display
        // Group by days for better visualization
        const dailyPrices = new Map<string, number[]>()

        for (const point of pricePoints) {
          const date = new Date(point.timestamp * 1000)
          const dateKey = `${date.getMonth() + 1}/${date.getDate()}`

          if (!dailyPrices.has(dateKey)) {
            dailyPrices.set(dateKey, [])
          }
          dailyPrices.get(dateKey)!.push(point.price)
        }

        // Calculate average price for each day
        const chartData = Array.from(dailyPrices.entries()).map(([date, prices]) => {
          const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
          return {
            name: date,
            uv: avgPrice,
          }
        })

        // Limit to last 30 data points for chart readability
        const limitedData = chartData.slice(-30)

        setPriceHistory(limitedData.length > 0 ? limitedData : [{ name: "Now", uv: 1.0 }])
      } catch (error) {
        console.error("Failed to fetch price history:", error)
        // Fallback to default
        setPriceHistory([{ name: "Now", uv: 1.0 }])
      } finally {
        setLoadingPriceHistory(false)
      }
    }

    fetchPriceHistory()
  }, [protocolContract, provider])

  useEffect(() => {
    const fetchData = async () => {
      if (isConnected && account && mcContract && jbcContract && protocolContract) {
        try {
          // Fetch MC Balance
          const mcBal = await mcContract.balanceOf(account)

          // Fetch JBC Balance
          const jbcBal = await jbcContract.balanceOf(account)

          // Fetch JBC Price from Contract (Spot Price)
          try {
            const priceWei = await protocolContract.getJBCPrice()
            setJbcPrice(ethers.formatEther(priceWei))
          } catch (e) {
            console.log("Price fetch failed (maybe old contract)", e)
          }

          // Fetch Protocol Info
          const userInfo = await protocolContract.userInfo(account)
          // userInfo returns: (referrer, activeDirects, teamCount, totalRevenue, currentCap, isActive)

          // Check referrer binding
          const currentReferrer = userInfo[0]
          if (currentReferrer && currentReferrer !== "0x0000000000000000000000000000000000000000") {
            setIsBound(true)
          } else {
            // 未绑定上级，检查 URL 中是否有 ref 参数
            const urlParams = new URLSearchParams(window.location.search)
            const refParam = urlParams.get("ref")
            if (refParam && !referrer) {
              setReferrer(refParam)
            }
          }

          // Calculate Level based on activeDirects (simplified V1-V9 logic)
          let level = "V0"
          const activeDirects = Number(userInfo[1])
          if (activeDirects >= 100000) level = "V9"
          else if (activeDirects >= 30000) level = "V8"
          else if (activeDirects >= 10000) level = "V7"
          else if (activeDirects >= 3000) level = "V6"
          else if (activeDirects >= 1000) level = "V5"
          else if (activeDirects >= 300) level = "V4"
          else if (activeDirects >= 100) level = "V3"
          else if (activeDirects >= 30) level = "V2"
          else if (activeDirects >= 10) level = "V1"

          setDisplayStats((prev) => ({
            ...prev,
            balanceUSDT: parseFloat(ethers.formatEther(mcBal)),
            balanceJBC: parseFloat(ethers.formatEther(jbcBal)),
            totalRevenue: parseFloat(ethers.formatEther(userInfo[3])),
            teamCount: Number(userInfo[2]),
            currentLevel: level,
          }))
        } catch (err) {
          console.error("Error fetching stats", err)
        }
      }
    }
    const timer = setInterval(fetchData, 5000) // Refresh every 5s
    fetchData()
    return () => clearInterval(timer)
  }, [isConnected, account, mcContract, jbcContract, protocolContract])

  const handleBind = async () => {
    if (referrer.trim() && protocolContract) {
      setIsBinding(true)
      try {
        // 提取 ref= 之后的地址
        let address = referrer.trim()
        const refMatch = address.match(/ref=([^&\s]+)/i)
        if (refMatch) {
          address = refMatch[1]
        }

        // 验证地址格式
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          toast.error("请输入正确的钱包地址")
          setIsBinding(false)
          return
        }

        const tx = await protocolContract.bindReferrer(address)
        await tx.wait()
        setIsBound(true)
        toast.success("Referrer Bound Successfully!")
      } catch (err: any) {
        console.error(err)
        toast.error("绑定失败: " + (err.reason || err.message))
      } finally {
        setIsBinding(false)
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Hero Section - User Dashboard Style */}
      <div className="relative rounded-2xl md:rounded-3xl overflow-hidden min-h-[300px] flex items-center justify-center text-center bg-dark-card border border-dark-border shadow-2xl">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg bg-hero-glow opacity-50 blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>

        <div className="relative z-10 p-6 md:p-12 w-full flex flex-col items-center">
          <div className="mb-6">
            <h2 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              {displayStats.balanceUSDT.toLocaleString()} <span className="text-3xl md:text-4xl text-slate-400 font-bold">USDT</span>
            </h2>
            <p className="text-blue-400 font-bold text-lg md:text-xl mt-2 tracking-wide uppercase">My Total Assets</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto">
            <button
              onClick={onJoinClick}
              className="flex-1 py-4 bg-primary-gradient hover:opacity-90 text-white font-bold text-lg rounded-xl shadow-lg shadow-purple-900/30 transition-all transform hover:-translate-y-1"
            >
              {t.stats.join}
            </button>
            <button
              onClick={onWhitepaperClick}
              className="flex-1 py-4 bg-dark-card2 hover:bg-slate-800 text-white border border-slate-700 font-bold text-lg rounded-xl transition-all"
            >
              {t.stats.whitepaper}
            </button>
          </div>
        </div>
      </div>

      {/* Bind Referrer Section (Moved from TeamLevel) */}
      <div className="glass-panel p-4 sm:p-5 md:p-6 rounded-xl md:rounded-2xl bg-dark-card border-l-4 border-macoin-500 flex flex-col items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
          <div className="bg-macoin-500/20 p-2 md:p-3 rounded-full text-macoin-500">
            <Link size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm md:text-base text-white">{t.team.bindTitle}</h3>
            <p className="text-xs md:text-sm text-slate-400">{t.team.bindDesc}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          {!isConnected ? (
            <button
              disabled
              className="px-4 py-2.5 md:px-6 md:py-3 bg-dark-card2 text-slate-500 font-bold rounded-lg cursor-not-allowed whitespace-nowrap text-sm md:text-base w-full sm:w-auto border border-dark-border"
            >
              Connect Wallet First
            </button>
          ) : isBound ? (
            <div className="px-4 py-2.5 md:px-6 md:py-3 bg-green-900/30 text-green-400 font-bold rounded-lg border border-green-900/50 flex items-center gap-2 text-sm md:text-base justify-center sm:justify-start">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {t.team.bindSuccess}
            </div>
          ) : (
            <>
              <input
                type="text"
                value={referrer}
                onChange={(e) => setReferrer(e.target.value)}
                placeholder={t.team.bindPlaceholder}
                className="w-full sm:w-48 md:w-64 px-3 py-2.5 md:px-4 md:py-3 bg-dark-card2 border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-macoin-500 text-white text-sm md:text-base"
              />
              <button
                onClick={handleBind}
                disabled={!referrer.trim() || isBinding}
                className="px-4 py-2.5 md:px-6 md:py-3 bg-macoin-500 hover:bg-macoin-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors shadow-lg shadow-macoin-500/20 whitespace-nowrap text-sm md:text-base"
              >
                {isBinding ? "Binding..." : t.team.bindButton}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Stat 1 */}
        <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl hover:border-macoin-500/40 transition-colors bg-dark-card border border-dark-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-3 md:mb-4 relative z-10">
            <span className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-wider">{t.stats.assets}</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Wallet size={18} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-1 relative z-10">
            {displayStats.balanceUSDT.toLocaleString()}
          </div>
        </div>

        {/* Stat 2 */}
        <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl hover:border-macoin-500/40 transition-colors bg-dark-card border border-dark-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-3 md:mb-4 relative z-10">
            <span className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-wider">{t.stats.holding}</span>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <Coins size={18} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-1 relative z-10">
            {displayStats.balanceARC.toLocaleString()}
          </div>
          <div className="text-xs text-macoin-400 flex items-center gap-1 relative z-10">
            ≈ {(displayStats.balanceARC * parseFloat(arcPrice)).toFixed(2)} USDT
          </div>
        </div>

        {/* Stat 3 */}
        <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl hover:border-macoin-500/40 transition-colors bg-dark-card border border-dark-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full blur-xl group-hover:bg-green-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-3 md:mb-4 relative z-10">
            <span className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-wider">{t.stats.revenue}</span>
            <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-1 relative z-10">
            {displayStats.totalRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 relative z-10">{t.stats.settlement}</div>
        </div>

        {/* Stat 4 */}
        <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl hover:border-macoin-500/40 transition-colors bg-dark-card border border-dark-border relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/10 rounded-full blur-xl group-hover:bg-pink-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-3 md:mb-4 relative z-10">
            <span className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-wider">{t.stats.level}</span>
            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                <Users size={18} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-1 relative z-10">
            {displayStats.currentLevel}
          </div>
          <div className="text-xs text-slate-500 relative z-10">
            {t.stats.teamCount}: {displayStats.teamCount}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl bg-dark-card border border-dark-border">
        <h3 className="text-base md:text-lg font-bold mb-4 md:mb-6 text-white border-l-4 border-macoin-500 pl-3 flex justify-between items-center">
          {t.stats.chartTitle}
          {fetchError && (
            <button 
              onClick={() => window.location.reload()} 
              className="text-xs text-red-500 hover:text-red-400 underline"
            >
              Load Failed (Retry)
            </button>
          )}
        </h3>
        {loadingPriceHistory ? (
          <div className="h-[200px] sm:h-[250px] md:h-[300px] w-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-macoin-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-slate-400">Loading price history...</p>
            </div>
          </div>
        ) : (
          <div className="h-[200px] sm:h-[250px] md:h-[300px] w-full min-h-[200px]" style={{ minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceHistory}>
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e1e2e",
                    borderColor: "#333",
                    color: "#fff",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
                  }}
                  itemStyle={{ color: "#a78bfa" }}
                />
                <Area
                  type="monotone"
                  dataKey="uv"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorUv)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatsPanel
