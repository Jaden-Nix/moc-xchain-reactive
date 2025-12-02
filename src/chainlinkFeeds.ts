import { ethers, JsonRpcProvider } from 'ethers'

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

const AGGREGATOR_V3_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
  'function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
]

const RPC_ENDPOINTS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.org',
  'https://sepolia.drpc.org',
  'https://rpc.ankr.com/eth_sepolia',
]

let currentRpcIndex = 0
let provider: JsonRpcProvider | null = null

function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(RPC_ENDPOINTS[currentRpcIndex], 11155111, { staticNetwork: true })
  }
  return provider
}

async function tryNextRpc(): Promise<JsonRpcProvider> {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length
  provider = new JsonRpcProvider(RPC_ENDPOINTS[currentRpcIndex], 11155111, { staticNetwork: true })
  return provider
}

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
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const rpcProvider = attempt === 0 ? getProvider() : await tryNextRpc()
      const contract = new ethers.Contract(feedAddress, AGGREGATOR_V3_ABI, rpcProvider)
      
      const [roundData, decimals] = await Promise.all([
        contract.latestRoundData(),
        contract.decimals(),
      ])
      
      const price = Number(roundData[1]) / Math.pow(10, decimals)
      const updatedAtTimestamp = Number(roundData[3])
      
      return {
        feed: feedAddress,
        pair: feedName,
        price,
        priceFormatted: `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        roundId: roundData[0].toString(),
        updatedAt: new Date(updatedAtTimestamp * 1000),
        updatedAtTimestamp,
        decimals,
        isReal: true,
        source: 'chainlink',
      }
    } catch (error) {
      if (attempt === 2) {
        console.error(`Failed to read ${feedName} after 3 attempts:`, error)
        return null
      }
    }
  }
  return null
}

export async function readAllChainlinkFeeds(): Promise<PriceData[]> {
  const results: PriceData[] = []
  
  for (const feed of CHAINLINK_SEPOLIA_FEEDS) {
    const data = await readChainlinkFeed(feed.address, feed.pair)
    if (data) {
      results.push(data)
    }
  }
  
  return results
}

export async function getHistoricalRounds(feedAddress: string, feedName: string, numRounds: number = 10): Promise<PriceHistory[]> {
  const history: PriceHistory[] = []
  
  try {
    const rpcProvider = getProvider()
    const contract = new ethers.Contract(feedAddress, AGGREGATOR_V3_ABI, rpcProvider)
    
    const latestData = await contract.latestRoundData()
    const latestRoundId = BigInt(latestData[0])
    const decimals = await contract.decimals()
    
    const phaseId = latestRoundId >> 64n
    const aggregatorRoundId = latestRoundId & ((1n << 64n) - 1n)
    
    let consecutiveFailures = 0
    const maxFailures = 3
    
    for (let i = 0; i < numRounds && consecutiveFailures < maxFailures; i++) {
      if (aggregatorRoundId - BigInt(i) < 1n) break
      
      try {
        const roundToQuery = (phaseId << 64n) | (aggregatorRoundId - BigInt(i))
        const roundData = await contract.getRoundData(roundToQuery)
        
        if (roundData[1] > 0n && roundData[3] > 0n) {
          const price = Number(roundData[1]) / Math.pow(10, decimals)
          const timestamp = Number(roundData[3]) * 1000
          
          history.push({
            timestamp,
            price,
            feed: feedName,
          })
          consecutiveFailures = 0
        }
      } catch {
        consecutiveFailures++
        continue
      }
    }
    
    if (history.length === 0 && latestData[1] > 0n) {
      history.push({
        timestamp: Number(latestData[3]) * 1000,
        price: Number(latestData[1]) / Math.pow(10, decimals),
        feed: feedName,
      })
    }
    
    return history.reverse()
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
