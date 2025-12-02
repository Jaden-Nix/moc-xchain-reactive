export interface ChainlinkFeed {
  name: string
  pair: string
  address: string
  decimals: number
  network: string
  chainId: number
}

export const CHAINLINK_SEPOLIA_FEEDS: ChainlinkFeed[] = [
  {
    name: 'ETH/USD',
    pair: 'ETH/USD',
    address: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    decimals: 8,
    network: 'Sepolia',
    chainId: 11155111,
  },
  {
    name: 'BTC/USD',
    pair: 'BTC/USD',
    address: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
    decimals: 8,
    network: 'Sepolia',
    chainId: 11155111,
  },
  {
    name: 'LINK/USD',
    pair: 'LINK/USD',
    address: '0xc59E3633BAAC79493d908e63626716e204A45EdF',
    decimals: 8,
    network: 'Sepolia',
    chainId: 11155111,
  },
]

export interface PriceData {
  feed: string
  pair: string
  price: number
  priceFormatted: string
  roundId: string
  updatedAt: Date
  updatedAtTimestamp: number
  decimals: number
  isReal: boolean
  source: 'chainlink' | 'mock'
}

export interface PriceHistory {
  timestamp: number
  price: number
  feed: string
}

export async function readChainlinkFeed(feedAddress: string, feedName: string): Promise<PriceData | null> {
  try {
    const response = await fetch('/api/chainlink-prices')
    const data = await response.json()
    
    if (data.success && data.prices) {
      const feedData = data.prices.find((p: any) => p.pair === feedName)
      if (feedData) {
        return {
          ...feedData,
          updatedAt: new Date(feedData.updatedAt),
        }
      }
    }
    return null
  } catch (error) {
    console.error(`Failed to read ${feedName}:`, error)
    return null
  }
}

export async function readAllChainlinkFeeds(): Promise<PriceData[]> {
  try {
    const response = await fetch('/api/chainlink-prices')
    const data = await response.json()
    
    if (data.success && data.prices) {
      return data.prices.map((p: any) => ({
        ...p,
        updatedAt: new Date(p.updatedAt),
      }))
    }
    return []
  } catch (error) {
    console.error('Failed to read Chainlink feeds:', error)
    return []
  }
}

export async function getHistoricalRounds(feedAddress: string, feedName: string, numRounds: number = 10): Promise<PriceHistory[]> {
  try {
    const response = await fetch(`/api/chainlink-history/${encodeURIComponent(feedName)}?rounds=${numRounds}`)
    const data = await response.json()
    
    if (data.success && data.history) {
      return data.history
    }
    return []
  } catch (error) {
    console.error('Failed to get historical rounds:', error)
    return []
  }
}

export interface PerformanceMetrics {
  avgLatency: number
  successRate: number
  totalRelays: number
  lastUpdateTime: number
  gasUsed: number
  uptime: number
}

export function calculatePerformanceMetrics(relayHistory: { timestamp: number; success: boolean; gasUsed?: number }[]): PerformanceMetrics {
  if (relayHistory.length === 0) {
    return {
      avgLatency: 0,
      successRate: 100,
      totalRelays: 0,
      lastUpdateTime: 0,
      gasUsed: 0,
      uptime: 100,
    }
  }
  
  const successfulRelays = relayHistory.filter(r => r.success)
  const successRate = (successfulRelays.length / relayHistory.length) * 100
  
  let avgLatency = 0
  if (relayHistory.length > 1) {
    const latencies: number[] = []
    for (let i = 1; i < relayHistory.length; i++) {
      latencies.push(relayHistory[i].timestamp - relayHistory[i - 1].timestamp)
    }
    avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length / 1000
  }
  
  const totalGasUsed = relayHistory.reduce((acc, r) => acc + (r.gasUsed || 0), 0)
  
  const firstRelay = relayHistory[0].timestamp
  const lastRelay = relayHistory[relayHistory.length - 1].timestamp
  const uptimeWindow = lastRelay - firstRelay
  const uptime = uptimeWindow > 0 ? successRate : 100
  
  return {
    avgLatency: Math.round(avgLatency * 10) / 10,
    successRate: Math.round(successRate * 10) / 10,
    totalRelays: relayHistory.length,
    lastUpdateTime: relayHistory[relayHistory.length - 1].timestamp,
    gasUsed: totalGasUsed,
    uptime: Math.round(uptime * 10) / 10,
  }
}
