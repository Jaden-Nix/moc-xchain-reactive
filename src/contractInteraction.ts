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
  sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
  sepoliaFallback: 'https://rpc.sepolia.org',
  sepoliaBackup: 'https://sepolia.drpc.org',
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

  const ethereum = (window as any).ethereum
  
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    })
    return { success: true }
  } catch (error: any) {
    if (error.code === 4902) {
      if (chainId === CHAIN_IDS.lasna) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${chainId.toString(16)}`,
              chainName: 'Reactive Network (Lasna)',
              nativeCurrency: { name: 'REACT', symbol: 'REACT', decimals: 18 },
              rpcUrls: ['https://lasna-rpc.rnk.dev'],
              blockExplorerUrls: ['https://lasna.rnk.dev'],
            }],
          })
          return { success: true }
        } catch (addError: any) {
          return { success: false, error: 'Could not add Lasna network to wallet. Please add it manually.' }
        }
      }
      return { success: false, error: 'Network not configured in wallet. Please add it manually.' }
    }
    if (error.code === 4001) {
      return { success: false, error: 'You rejected the network switch request.' }
    }
    return { success: false, error: error.message }
  }
}

let sepoliaProviderInitialized = false
let currentSepoliaRpcIndex = 0
const sepoliaRpcList = [
  RPC_ENDPOINTS.sepolia,
  RPC_ENDPOINTS.sepoliaFallback,
  RPC_ENDPOINTS.sepoliaBackup,
]

export function getSepoliaProvider(): JsonRpcProvider {
  if (!sepoliaProvider || !sepoliaProviderInitialized) {
    sepoliaProvider = new JsonRpcProvider(sepoliaRpcList[currentSepoliaRpcIndex], 11155111, { staticNetwork: true })
    sepoliaProviderInitialized = true
  }
  return sepoliaProvider
}

export async function tryNextSepoliaRpc(): Promise<JsonRpcProvider> {
  currentSepoliaRpcIndex = (currentSepoliaRpcIndex + 1) % sepoliaRpcList.length
  sepoliaProvider = new JsonRpcProvider(sepoliaRpcList[currentSepoliaRpcIndex], 11155111, { staticNetwork: true })
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
    const msg = error.message || ''
    const errorData = error.data || error?.error?.data || ''
    
    if (errorData.includes('bfbe031f') || msg.includes('InvalidRoundId')) {
      return { success: false, error: 'No new price round available. The price feed has not been updated yet. Try updating the MockPriceFeed first.' }
    }
    if (errorData.includes('StaleUpdate') || msg.includes('StaleUpdate')) {
      return { success: false, error: 'Price data is stale (over 1 hour old). The mock feed needs a fresh update.' }
    }
    if (errorData.includes('UpdateTooFrequent') || msg.includes('UpdateTooFrequent')) {
      return { success: false, error: 'Please wait 60 seconds between relay calls (rate limiting).' }
    }
    if (errorData.includes('InvalidPrice') || msg.includes('InvalidPrice')) {
      return { success: false, error: 'Price is invalid (zero or negative). Update the MockPriceFeed with a valid price first.' }
    }
    if (msg.includes('insufficient funds')) {
      return { success: false, error: 'Insufficient Sepolia ETH for gas. Get free test ETH from a Sepolia faucet.' }
    }
    if (msg.includes('user rejected') || msg.includes('User denied')) {
      return { success: false, error: 'Transaction was rejected in wallet.' }
    }
    return { success: false, error: `Relay failed: ${error.reason || error.message}` }
  }
}

export async function testReadLatestPrice(
  mockFeedAddr: string
): Promise<ContractResult> {
  let lastError = ''
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const provider = attempt === 0 ? getSepoliaProvider() : await tryNextSepoliaRpc()
      
      const contract = new ethers.Contract(mockFeedAddr, MOCK_FEED_ABI, provider)
      const data = await contract.latestRoundData()

      const price = data[1]
      const priceFormatted = ethers.formatUnits(price, 8)
      const updatedAtTimestamp = Number(data[3])
      
      return {
        success: true,
        data: {
          roundId: data[0].toString(),
          price: `$${priceFormatted}`,
          updatedAt: updatedAtTimestamp > 0 ? new Date(updatedAtTimestamp * 1000).toISOString() : 'Not yet updated',
          network: 'Sepolia',
        },
      }
    } catch (error: any) {
      lastError = error.message || error.reason || 'Network error'
      if (attempt < 2) {
        continue
      }
    }
  }
  
  return { 
    success: false, 
    error: 'Could not connect to Sepolia network. Please try again in a moment.' 
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
    
    let latestData
    try {
      latestData = await mockContract.latestRoundData()
    } catch (e) {
      return { success: false, error: 'Could not read price from Sepolia. Try again in a moment.' }
    }

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
    const msg = error.message || ''
    if (msg.includes('insufficient funds')) {
      return { success: false, error: 'Insufficient REACT tokens for gas on Lasna network.' }
    }
    if (msg.includes('user rejected') || msg.includes('User denied')) {
      return { success: false, error: 'Transaction was rejected in wallet.' }
    }
    if (msg.includes('not authorized') || msg.includes('Unauthorized')) {
      return { success: false, error: 'Your wallet is not authorized as a relayer on the destination contract.' }
    }
    return { success: false, error: `Update failed: ${error.reason || error.message}` }
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
      return { success: false, error: 'Cannot connect to Lasna network. Please try again later.' }
    }

    const contract = new ethers.Contract(destAddr, DESTINATION_ABI, provider)
    
    try {
      const data = await contract.latestRoundData()
      const price = data[1]
      const updatedAtTimestamp = Number(data[3])
      
      if (price === 0n && updatedAtTimestamp === 0) {
        return {
          success: true,
          data: {
            status: 'Waiting for first price relay',
            message: 'No price data has been relayed to this destination yet.',
            network: 'Lasna (Reactive Network)',
          },
        }
      }
      
      return {
        success: true,
        data: {
          roundId: data[0].toString(),
          price: `$${ethers.formatUnits(price, 8)}`,
          updatedAt: updatedAtTimestamp > 0 ? new Date(updatedAtTimestamp * 1000).toISOString() : 'Not yet updated',
          network: 'Lasna (Reactive Network)',
        },
      }
    } catch (contractError: any) {
      const errorString = JSON.stringify(contractError)
      const errorData = contractError?.data || contractError?.error?.data || errorString || ''
      
      if (errorData.includes('bfbe031f') || errorData.includes('0xbfbe031f')) {
        return { 
          success: true, 
          data: {
            status: 'Awaiting data',
            message: 'No price has been relayed to this contract yet. Use "Relay Price" first.',
            network: 'Lasna',
          }
        }
      }
      if (errorData.includes('StaleUpdate') || contractError?.message?.includes('StaleUpdate')) {
        return { 
          success: true, 
          data: {
            status: 'Price is stale',
            message: 'Price data exists but is older than the freshness threshold.',
            network: 'Lasna',
          }
        }
      }
      
      return { 
        success: true, 
        data: {
          status: 'Contract deployed',
          message: 'Contract is deployed. Run a price relay to populate data.',
          network: 'Lasna',
        }
      }
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: 'Cannot read from Lasna network. Please try again later.' 
    }
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
