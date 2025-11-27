import { ethers, BrowserProvider } from 'ethers'

// Contract ABIs (simplified versions needed for interactions)
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
  'event PriceUpdated(uint80 indexed roundId, int256 answer, uint256 updatedAt)',
]

interface ContractResult {
  success: boolean
  data?: any
  error?: string
  txHash?: string
}

export async function getProvider(): Promise<BrowserProvider> {
  // Connect to local Hardhat node
  return new ethers.BrowserProvider(
    new ethers.JsonRpcProvider('http://127.0.0.1:8545')
  )
}

export async function getSigner() {
  const provider = await getProvider()
  return provider.getSigner()
}

export async function getMockFeedContract(address: string) {
  const provider = await getProvider()
  return new ethers.Contract(address, MOCK_FEED_ABI, provider)
}

export async function getMockFeedContractWithSigner(address: string) {
  const signer = await getSigner()
  return new ethers.Contract(address, MOCK_FEED_ABI, signer)
}

export async function getOriginRelayContractWithSigner(address: string) {
  const signer = await getSigner()
  return new ethers.Contract(address, ORIGIN_RELAY_ABI, signer)
}

export async function getDestinationContractWithSigner(address: string) {
  const signer = await getSigner()
  return new ethers.Contract(address, DESTINATION_ABI, signer)
}

// Test Functions
export async function testUpdatePrice(
  mockFeedAddr: string,
  priceInUSD: number
): Promise<ContractResult> {
  try {
    const contract = await getMockFeedContractWithSigner(mockFeedAddr)
    const priceWith8Decimals = ethers.parseUnits(priceInUSD.toString(), 8)
    const tx = await contract.setPrice(priceWith8Decimals)
    const receipt = await tx.wait()
    return {
      success: true,
      txHash: tx.hash,
      data: {
        price: `$${priceInUSD}`,
        status: 'Price updated successfully',
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function testRelayPrice(
  originRelayAddr: string
): Promise<ContractResult> {
  try {
    const contract = await getOriginRelayContractWithSigner(originRelayAddr)
    
    // Set min update interval to 10 seconds for testing
    const setTx = await contract.setMinUpdateInterval(10)
    await setTx.wait()
    
    // Call relay
    const tx = await contract.relayLatestPrice()
    const receipt = await tx.wait()
    
    return {
      success: true,
      txHash: tx.hash,
      data: {
        status: 'Price relayed from origin',
        gasUsed: receipt?.gasUsed.toString(),
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function testReadLatestPrice(
  mockFeedAddr: string
): Promise<ContractResult> {
  try {
    const contract = await getMockFeedContract(mockFeedAddr)
    const data = await contract.latestRoundData()
    return {
      success: true,
      data: {
        roundId: data[0].toString(),
        price: `$${ethers.formatUnits(data[1], 8)}`,
        updatedAt: new Date(Number(data[3]) * 1000).toISOString(),
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function testZeroPrice(
  mockFeedAddr: string
): Promise<ContractResult> {
  try {
    const contract = await getMockFeedContractWithSigner(mockFeedAddr)
    // Try to set zero price - should fail
    await contract.setPrice(0)
    return {
      success: false,
      error: 'Expected zero price to be rejected, but it was accepted!',
    }
  } catch (error: any) {
    if (error.message.includes('greater than 0')) {
      return {
        success: true,
        data: { status: '✓ Zero price correctly rejected' },
      }
    }
    return { success: false, error: error.message }
  }
}

export async function testNegativePrice(
  mockFeedAddr: string
): Promise<ContractResult> {
  try {
    const contract = await getMockFeedContractWithSigner(mockFeedAddr)
    const negativePrice = ethers.parseUnits('-100', 8)
    await contract.setPrice(negativePrice)
    return {
      success: false,
      error: 'Expected negative price to be rejected',
    }
  } catch (error: any) {
    return {
      success: true,
      data: { status: '✓ Negative price correctly rejected' },
    }
  }
}

export async function testDestinationUpdate(
  destAddr: string,
  mockFeedAddr: string
): Promise<ContractResult> {
  try {
    const mockContract = await getMockFeedContract(mockFeedAddr)
    const latestData = await mockContract.latestRoundData()
    
    const destContract = await getDestinationContractWithSigner(destAddr)
    const tx = await destContract.updatePrice(
      latestData[0],
      latestData[1],
      latestData[2],
      latestData[3],
      latestData[4]
    )
    await tx.wait()
    
    return {
      success: true,
      txHash: tx.hash,
      data: {
        status: 'Destination updated successfully',
        price: `$${ethers.formatUnits(latestData[1], 8)}`,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function testReadDestinationPrice(
  destAddr: string
): Promise<ContractResult> {
  try {
    const provider = await getProvider()
    const contract = new ethers.Contract(destAddr, DESTINATION_ABI, provider)
    const data = await contract.latestRoundData()
    
    return {
      success: true,
      data: {
        roundId: data[0].toString(),
        price: `$${ethers.formatUnits(data[1], 8)}`,
        updatedAt: new Date(Number(data[3]) * 1000).toISOString(),
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function testStalenessCheck(
  destAddr: string
): Promise<ContractResult> {
  try {
    const provider = await getProvider()
    const contract = new ethers.Contract(destAddr, DESTINATION_ABI, provider)
    const isStale = await contract.isStale()
    
    return {
      success: true,
      data: {
        status: isStale ? '⚠ Price is stale' : '✓ Price is fresh',
        stale: isStale,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
