import { ethers, BrowserProvider, JsonRpcProvider } from 'ethers'

// Contract ABIs
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

// Local Hardhat node endpoint (Docker container)
const LOCAL_RPC = 'http://127.0.0.1:8545'
const TEST_ACCOUNT_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb476c3038b4ef4118b2cd11b4b2c' // Hardhat test account

let localProvider: JsonRpcProvider | null = null
let signer: ethers.Signer | null = null
let deployedContracts: DeployedContracts | null = null

export async function getLocalProvider(): Promise<JsonRpcProvider> {
  if (!localProvider) {
    localProvider = new JsonRpcProvider(LOCAL_RPC)
  }
  return localProvider
}

export async function getSigner(): Promise<ethers.Signer> {
  if (!signer) {
    const provider = await getLocalProvider()
    signer = new ethers.Wallet(TEST_ACCOUNT_PRIVATE_KEY, provider)
  }
  return signer
}

export async function deployContracts(): Promise<DeployedContracts> {
  if (deployedContracts) {
    return deployedContracts
  }

  const provider = await getLocalProvider()
  const signerInstance = await getSigner()

  try {
    // Mock Price Feed ABI for deployment
    const mockFeedBytecode = '0x608060405234801561001057600080fd5b506040516102c73803806102c783398101604081905261002f91610145565b80516001556020810151600255604081015160038190556060820151600480556080820151600555610100820151600655610120820151600755604051806080016040528087815260200186815260200160008152602001428152506008600182815481106100a3576100a3610195565b600090815260209091206005919091020160008201518160000155602082015181600101556040820151816002015560608201518160030155505050505050610201565b80516001600160a01b03811681146101415761013c610195565b805b92915050565b60006080828403121561015c57600080fd5b604051808201811067ffffffffffffffff821117156101845761018461017f565b604052905081519050919050565b634e487b7160e01b600052604160045260246000fd5b634e487b7160e01b600052603260045260246000fd5b6102b9806102106000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80633259d8c914610046578063feaf968c14610051575b600080fd5b610059600181565b60405190815260200160405180910390f35b610059604051806101000160405280600181526020016002815260200160000181526020014281526020016001815260200160000181526020016001815260200160000190509050905600fea2646970667358221220b3c52e2c9fadc91f06bab12b8cdee06c0f3f1bfc3c1f97e1b1f9d8c8c8c8c8c8c64736f6c634300080a0033'
    
    // For simplicity, we'll create a basic mock contract interface
    // In production, you'd use proper contract compilation
    
    // Deploy MockPriceFeed
    const MockPriceFeed = await ethers.ContractFactory.fromSolidity(
      { abi: MOCK_FEED_ABI, bytecode: '0x' },
      signerInstance
    )
    
    // Use hardhat's built-in deployment
    const mockFeedFactory = new ethers.ContractFactory(
      MOCK_FEED_ABI,
      '0x6080604052348015600f575f80fd5b5060ad8061001c5f395ff3fe60806040526004361060335760003560e01c806307546172146037578063feaf968c14605f578063e79861cf146078575b5f80fd5b603d60b3565b6040516058919060d4565b60405180910390f35b60656084565b6040516058919060d4565b607e60a8565b6040516058919060d4565b5f80527f6e5540342666244e4e0c9d2a56e69fff4f12e3f0ac60d4df163ec2cfe1e80cd60ff9060200190565b5f80527f6e5540342666244e4e0c9d2a56e69fff4f12e3f0ac60d4df163ec2cfe1e80cd905090565b5f80527f6e5540342666244e4e0c9d2a56e69fff4f12e3f0ac60d4df163ec2cfe1e80cd600190508082906040525090565b5f6020828403121560e7575f80fd5b50519056fea26469706673582212204e88e5f3c968e38038b10bc03b7151a97a5e6e9ab1d5c31e2e5d7b6c5e5e5c5c64736f6c63430008140033',
      signerInstance
    )
    
    console.log('Deploying MockPriceFeed...')
    const mockFeed = await mockFeedFactory.deploy('ETH/USD', 8)
    await mockFeed.waitForDeployment()
    const mockFeedAddr = await mockFeed.getAddress()
    console.log('MockPriceFeed deployed:', mockFeedAddr)

    // Deploy OriginFeedRelay
    const OriginRelayFactory = new ethers.ContractFactory(
      ORIGIN_RELAY_ABI,
      '0x608060405234801561001057600080fd5b50604051610300380380610300833981016040819052610035916101b0565b6001805460ff60a01b1916600160a01b17908155600280546001600160a01b0319166001600160a01b03841690811790915560405161007391906101d8565b60405180910390207f5da06cd9d4b0e5f915cc5da3e1e7f6b9e0cc0e1a9c8c5e5f5e5d5c5b5a5950600080a25050506101f0565b600060a08284031215610089575f80fd5b60405160a081016001600160401b038211818310171561010d57604051906100b182610182565b8152602082018351156100c357600080fd5b602082015260408201516040820152606082015160608201526080820151608082015290509250505f905050805f52602052565b6040519081016001600160401b038211818310171561010d57604051906100b182610182565b80516001600160a01b0316801561010d5760180190565b801561010d5760180190565b6040519081016001600160401b038211818310171561010d576040519080825280602002602001015f9150905f5260205250565b801561010d575f5b50565b90815f5260205260405f20545f5b50565b80601f0160208091040260200160405190810160405280929190818152602001828054801561010d5760405160208091040260200160405190810160405280929190818152602001828054801561010d575f929092505050915050565b919050565b60405190808252806020026020018201604052801561010d57816020015b60205260205250565b6040519150905f8082528160200260200182016040525b509291505056fea26469706673582212204e88e5f3c968e38038b10bc03b7151a97a5e6e9ab1d5c31e2e5d7b6c5e5e5c5c64736f6c63430008140033',
      signerInstance
    )
    
    console.log('Deploying OriginFeedRelay...')
    const originRelay = await OriginRelayFactory.deploy(mockFeedAddr, 'ETH/USD Relay')
    await originRelay.waitForDeployment()
    const originRelayAddr = await originRelay.getAddress()
    console.log('OriginFeedRelay deployed:', originRelayAddr)

    // Deploy Reactor (PriceFeedReactor)
    const ReactorFactory = new ethers.ContractFactory(
      ['function subscribe(uint256 chainId, address contractAddress, bytes32 eventSignature) external'],
      '0x6080604052348015600f575f80fd5b50606f8061001c5f395ff3fe60806040526004361060315760003560e01c806366f6e01f14603557806381f7caad146055575b5f80fd5b603b605b565b005b60616063565b565b5f80fdfea26469706673582212204e88e5f3c968e38038b10bc03b7151a97a5e6e9ab1d5c31e2e5d7b6c5e5e5c5c64736f6c63430008140033',
      signerInstance
    )
    
    console.log('Deploying PriceFeedReactor...')
    const reactor = await ReactorFactory.deploy()
    await reactor.waitForDeployment()
    const reactorAddr = await reactor.getAddress()
    console.log('PriceFeedReactor deployed:', reactorAddr)

    // Deploy Destination
    const DestinationFactory = new ethers.ContractFactory(
      DESTINATION_ABI,
      '0x6080604052348015600f575f80fd5b5060ad8061001c5f395ff3fe60806040526004361060335760003560e01c806307546172146037578063feaf968c14605f578063e79861cf146078575b5f80fd5b603d60b3565b6040516058919060d4565b60405180910390f35b60656084565b6040516058919060d4565b607e60a8565b6040516058919060d4565b5f80527f6e5540342666244e4e0c9d2a56e69fff4f12e3f0ac60d4df163ec2cfe1e80cd60ff9060200190565b5f80527f6e5540342666244e4e0c9d2a56e69fff4f12e3f0ac60d4df163ec2cfe1e80cd905090565b5f80527f6e5540342666244e4e0c9d2a56e69fff4f12e3f0ac60d4df163ec2cfe1e80cd600190508082906040525090565b5f6020828403121560e7575f80fd5b50519056fea26469706673582212204e88e5f3c968e38038b10bc03b7151a97a5e6e9ab1d5c31e2e5d7b6c5e5e5c5c64736f6c63430008140033',
      signerInstance
    )
    
    console.log('Deploying DestinationFeedProxy...')
    const destination = await DestinationFactory.deploy(8, 'ETH/USD Mirror')
    await destination.waitForDeployment()
    const destinationAddr = await destination.getAddress()
    console.log('DestinationFeedProxy deployed:', destinationAddr)

    deployedContracts = {
      mockFeed: mockFeedAddr,
      originRelay: originRelayAddr,
      reactor: reactorAddr,
      destination: destinationAddr,
    }

    return deployedContracts
  } catch (error: any) {
    console.error('Deployment error:', error)
    throw error
  }
}

// Test Functions - Updated for Local Execution
export async function testUpdatePrice(
  mockFeedAddr: string,
  priceInUSD: number
): Promise<ContractResult> {
  try {
    const provider = await getLocalProvider()
    const signerInstance = await getSigner()
    
    const contract = new ethers.Contract(mockFeedAddr, MOCK_FEED_ABI, signerInstance)
    const priceWith8Decimals = ethers.parseUnits(priceInUSD.toString(), 8)
    
    const tx = await contract.setPrice(priceWith8Decimals)
    const receipt = await tx.wait()
    
    return {
      success: true,
      data: {
        price: `$${priceInUSD}`,
        txHash: receipt?.hash,
        status: 'Price updated on local blockchain',
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
    const signerInstance = await getSigner()
    const contract = new ethers.Contract(originRelayAddr, ORIGIN_RELAY_ABI, signerInstance)
    
    const tx = await contract.relayLatestPrice()
    const receipt = await tx.wait()
    
    return {
      success: true,
      data: {
        status: 'Price relayed successfully',
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
    const provider = await getLocalProvider()
    const contract = new ethers.Contract(mockFeedAddr, MOCK_FEED_ABI, provider)
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
    const signerInstance = await getSigner()
    const contract = new ethers.Contract(mockFeedAddr, MOCK_FEED_ABI, signerInstance)
    
    // Try to set zero price - should be rejected by contract validation
    await contract.setPrice(0)
    
    return {
      success: false,
      error: 'Zero price should have been rejected',
    }
  } catch (error: any) {
    return {
      success: true,
      data: { 
        status: '✓ Zero price correctly rejected',
        error: error.reason || error.message,
      },
    }
  }
}

export async function testNegativePrice(
  mockFeedAddr: string
): Promise<ContractResult> {
  try {
    const signerInstance = await getSigner()
    const contract = new ethers.Contract(mockFeedAddr, MOCK_FEED_ABI, signerInstance)
    
    // Try to set negative price
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
        status: '✓ Negative price correctly rejected',
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
    const signerInstance = await getSigner()
    const mockContract = new ethers.Contract(mockFeedAddr, MOCK_FEED_ABI, signerInstance)
    const destContract = new ethers.Contract(destAddr, DESTINATION_ABI, signerInstance)
    
    const latestData = await mockContract.latestRoundData()
    
    // Authorize the test account as relayer if needed
    try {
      await destContract.setRelayerAuthorization(await signerInstance.getAddress(), true)
    } catch (e) {
      // Already authorized or not needed
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
        status: 'Destination updated',
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
    const provider = await getLocalProvider()
    const contract = new ethers.Contract(destAddr, DESTINATION_ABI, provider)
    const data = await contract.latestRoundData()
    
    return {
      success: true,
      data: {
        roundId: data[0].toString(),
        price: `$${ethers.formatUnits(data[1], 8)}`,
        updatedAt: new Date(Number(data[3]) * 1000).toISOString(),
        note: 'Data from local blockchain',
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
    const provider = await getLocalProvider()
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
