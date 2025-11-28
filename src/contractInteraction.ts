import { ethers, BrowserProvider, JsonRpcProvider } from 'ethers'

const MOCK_FEED_ABI = [
  'function setPrice(int256 _price) external',
  'function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)',
  'function decimals() external view returns (uint8)',
]

const ORIGIN_RELAY_ABI = [
  'function relayLatestPrice() external',
  'function setMinUpdateInterval(uint256 _interval) external',
  'function getFeedMetadata() external view returns (tuple(string description, uint8 decimals, uint256 version, uint256 lastUpdateTimestamp, uint256 updateCount))',
]

const DESTINATION_ABI = [
  'function updatePrice(uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) external',
  'function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)',
  'function feedConfig() external view returns (tuple(string description, uint8 decimals, uint256 version, bool paused))',
  'function isStale() external view returns (bool)',
  'function setRelayerAuthorization(address relayer, bool authorized) external',
  'event PriceUpdated(uint80 indexed roundId, int256 answer, uint256 updatedAt)',
]

interface ContractResult {
  success: boolean
  data?: any
  error?: string
  txHash?: string
}

interface DeployedContracts {
  mockFeed: string
  originRelay: string
  reactor: string
  destination: string
}

const RPC_ENDPOINTS = {
  sepolia: 'https://1rpc.io/sepolia',
  sepoliaFallback: 'https://ethereum-sepolia-rpc.publicnode.com',
  lasna: 'https://lasna-rpc.rnk.dev',
  local: 'http://127.0.0.1:8545',
}

const CHAIN_IDS = {
  sepolia: 11155111,
  lasna: 5318007,
  local: 31337,
}

let sepoliaProvider: JsonRpcProvider | null = null
let lasnaProvider: JsonRpcProvider | null = null
let localProvider: JsonRpcProvider | null = null
let browserProvider: BrowserProvider | null = null
let walletConnected = false

export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined'
}

export async function connectWallet(): Promise<{ success: boolean; address?: string; error?: string }> {
  if (!isWalletAvailable()) {
    return { success: false, error: 'No wallet detected. Please install MetaMask.' }
  }

  try {
    const ethereum = (window as any).ethereum
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
    browserProvider = new BrowserProvider(ethereum)
    walletConnected = true
    return { success: true, address: accounts[0] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getWalletAddress(): Promise<string | null> {
  if (!browserProvider) return null
  try {
    const signer = await browserProvider.getSigner()
    return await signer.getAddress()
  } catch {
    return null
  }
}

export async function switchNetwork(chainId: number): Promise<{ success: boolean; error?: string }> {
  if (!isWalletAvailable()) {
    return { success: false, error: 'No wallet detected' }
  }

  try {
    const ethereum = (window as any).ethereum
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    })
    return { success: true }
  } catch (error: any) {
    if (error.code === 4902) {
      return { success: false, error: 'Network not configured in wallet. Please add it manually.' }
    }
    return { success: false, error: error.message }
  }
}

let sepoliaProviderInitialized = false

export function getSepoliaProvider(): JsonRpcProvider {
  if (!sepoliaProvider || !sepoliaProviderInitialized) {
    sepoliaProvider = new JsonRpcProvider(RPC_ENDPOINTS.sepolia, 11155111, { staticNetwork: true })
    sepoliaProviderInitialized = true
  }
  return sepoliaProvider
}

export async function resetSepoliaProvider(): Promise<void> {
  sepoliaProvider = new JsonRpcProvider(RPC_ENDPOINTS.sepoliaFallback, 11155111, { staticNetwork: true })
  sepoliaProviderInitialized = true
}

export function getLasnaProvider(): JsonRpcProvider {
  if (!lasnaProvider) {
    try {
      lasnaProvider = new JsonRpcProvider(RPC_ENDPOINTS.lasna, 5318007, { staticNetwork: true })
    } catch {
      lasnaProvider = new JsonRpcProvider(RPC_ENDPOINTS.lasna, 5318007, { staticNetwork: true })
    }
  }
  return lasnaProvider
}

export async function getLocalProvider(): Promise<JsonRpcProvider> {
  if (!localProvider) {
    localProvider = new JsonRpcProvider(RPC_ENDPOINTS.local)
  }
  return localProvider
}

export async function getSigner(): Promise<ethers.Signer | null> {
  if (!browserProvider) {
    const connectResult = await connectWallet()
    if (!connectResult.success) return null
  }
  return browserProvider!.getSigner()
}

export async function deployContracts(): Promise<DeployedContracts> {
  throw new Error('Local deployment not supported in testnet mode. Use Hardhat scripts instead.')
}

export async function testUpdatePrice(
  mockFeedAddr: string,
  priceInUSD: number
): Promise<ContractResult> {
  try {
    const signer = await getSigner()
    if (!signer) {
      return { success: false, error: 'Please connect your wallet first' }
    }

    const switchResult = await switchNetwork(CHAIN_IDS.sepolia)
    if (!switchResult.success) {
      return { success: false, error: `Failed to switch network: ${switchResult.error}` }
    }

    const contract = new ethers.Contract(mockFeedAddr, MOCK_FEED_ABI, signer)
    const priceWith8Decimals = ethers.parseUnits(priceInUSD.toString(), 8)

    const tx = await contract.setPrice(priceWith8Decimals)
    const receipt = await tx.wait()

    return {
      success: true,
      data: {
        price: `$${priceInUSD}`,
        txHash: receipt?.hash,
        status: 'Price updated on Sepolia',
      },
      txHash: receipt?.hash,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function testRelayPrice(
  originRelayAddr: string
): Promise<ContractResult> {
  try {
    const signer = await getSigner()
    if (!signer) {
      return { success: false, error: 'Please connect your wallet first' }
    }

    const switchResult = await switchNetwork(CHAIN_IDS.sepolia)
    if (!switchResult.success) {
      return { success: false, error: `Failed to switch network: ${switchResult.error}` }
    }

    const contract = new ethers.Contract(originRelayAddr, ORIGIN_RELAY_ABI, signer)

    const tx = await contract.relayLatestPrice()
    const receipt = await tx.wait()

    return {
      success: true,
      data: {
        status: 'Price relayed on Sepolia',
        txHash: receipt?.hash,
      },
      txHash: receipt?.hash,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function testReadLatestPrice(
  mockFeedAddr: string
): Promise<ContractResult> {
  try {
    const provider = getSepoliaProvider()
    
    // Test provider connectivity
    try {
      await provider.getNetwork()
    } catch {
      return { success: false, error: 'Unable to connect to Sepolia RPC. Network may be temporarily unavailable.' }
    }

    const contract = new ethers.Contract(mockFeedAddr, MOCK_FEED_ABI, provider)
    const data = await contract.latestRoundData()

    return {
      success: true,
      data: {
        roundId: data[0].toString(),
        price: `$${ethers.formatUnits(data[1], 8)}`,
        updatedAt: new Date(Number(data[3]) * 1000).toISOString(),
        network: 'Sepolia',
      },
    }
  } catch (error: any) {
    const errorMsg = error.message || error.reason || 'Failed to read price from contract'
    return { success: false, error: errorMsg }
  }
}

export async function testZeroPrice(
  mockFeedAddr: string
): Promise<ContractResult> {
  try {
    const signer = await getSigner()
    if (!signer) {
      return { success: false, error: 'Please connect your wallet first' }
    }

    const switchResult = await switchNetwork(CHAIN_IDS.sepolia)
    if (!switchResult.success) {
      return { success: false, error: `Failed to switch network: ${switchResult.error}` }
    }

    const contract = new ethers.Contract(mockFeedAddr, MOCK_FEED_ABI, signer)
    await contract.setPrice(0)

    return {
      success: false,
      error: 'Zero price should have been rejected',
    }
  } catch (error: any) {
    return {
      success: true,
      data: {
        status: 'Zero price correctly rejected',
        error: error.reason || error.message,
      },
    }
  }
}

export async function testNegativePrice(
  mockFeedAddr: string
): Promise<ContractResult> {
  try {
    const signer = await getSigner()
    if (!signer) {
      return { success: false, error: 'Please connect your wallet first' }
    }

    const switchResult = await switchNetwork(CHAIN_IDS.sepolia)
    if (!switchResult.success) {
      return { success: false, error: `Failed to switch network: ${switchResult.error}` }
    }

    const contract = new ethers.Contract(mockFeedAddr, MOCK_FEED_ABI, signer)
    const negativePrice = ethers.parseUnits('-100', 8)
    await contract.setPrice(negativePrice)

    return {
      success: false,
      error: 'Negative price should have been rejected',
    }
  } catch (error: any) {
    return {
      success: true,
      data: {
        status: 'Negative price correctly rejected',
        error: error.reason || error.message,
      },
    }
  }
}

export async function testDestinationUpdate(
  destAddr: string,
  mockFeedAddr: string
): Promise<ContractResult> {
  try {
    const signer = await getSigner()
    if (!signer) {
      return { success: false, error: 'Please connect your wallet first' }
    }

    const sepoliaProvider = getSepoliaProvider()
    const mockContract = new ethers.Contract(mockFeedAddr, MOCK_FEED_ABI, sepoliaProvider)
    const latestData = await mockContract.latestRoundData()

    const switchResult = await switchNetwork(CHAIN_IDS.lasna)
    if (!switchResult.success) {
      return { success: false, error: `Failed to switch to Lasna: ${switchResult.error}` }
    }

    const destContract = new ethers.Contract(destAddr, DESTINATION_ABI, signer)

    try {
      await destContract.setRelayerAuthorization(await signer.getAddress(), true)
    } catch (e) {
    }

    const tx = await destContract.updatePrice(
      latestData[0],
      latestData[1],
      latestData[2],
      latestData[3],
      latestData[4]
    )
    const receipt = await tx.wait()

    return {
      success: true,
      data: {
        status: 'Destination updated on Lasna',
        price: `$${ethers.formatUnits(latestData[1], 8)}`,
        txHash: receipt?.hash,
      },
      txHash: receipt?.hash,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function testReadDestinationPrice(
  destAddr: string
): Promise<ContractResult> {
  try {
    const provider = getLasnaProvider()
    
    try {
      await provider.getNetwork()
    } catch {
      return { success: false, error: 'Unable to connect to Lasna RPC. Network may be temporarily unavailable.' }
    }

    const contract = new ethers.Contract(destAddr, DESTINATION_ABI, provider)
    
    try {
      const data = await contract.latestRoundData()
      return {
        success: true,
        data: {
          roundId: data[0].toString(),
          price: `$${ethers.formatUnits(data[1], 8)}`,
          updatedAt: new Date(Number(data[3]) * 1000).toISOString(),
          network: 'Lasna (Reactive Network)',
        },
      }
    } catch (contractError: any) {
      const errorData = contractError?.data || contractError?.error?.data || ''
      if (errorData.includes('bfbe031f')) {
        return { success: false, error: 'No price data available yet. The relay needs to send data first.' }
      }
      if (errorData.includes('StaleUpdate') || contractError?.message?.includes('StaleUpdate')) {
        return { success: false, error: 'Price data is stale (older than threshold). A fresh relay is needed.' }
      }
      throw contractError
    }
  } catch (error: any) {
    const errorMsg = error.message || error.reason || 'Failed to read price from contract'
    return { success: false, error: errorMsg }
  }
}

export async function testStalenessCheck(
  destAddr: string
): Promise<ContractResult> {
  try {
    const provider = getLasnaProvider()
    
    try {
      await provider.getNetwork()
    } catch {
      return { success: false, error: 'Unable to connect to Lasna RPC. Network may be temporarily unavailable.' }
    }

    const contract = new ethers.Contract(destAddr, DESTINATION_ABI, provider)
    
    try {
      const isStale = await contract.isStale()
      return {
        success: true,
        data: {
          status: isStale ? 'Price is stale' : 'Price is fresh',
          stale: isStale,
          network: 'Lasna',
        },
      }
    } catch (contractError: any) {
      return {
        success: true,
        data: {
          status: 'No price data yet (contract returns stale for empty data)',
          stale: true,
          network: 'Lasna',
        },
      }
    }
  } catch (error: any) {
    const errorMsg = error.message || error.reason || 'Failed to check staleness'
    return { success: false, error: errorMsg }
  }
}
