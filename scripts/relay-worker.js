const { ethers } = require('ethers');
require('dotenv').config();

const USE_REAL_CHAINLINK = process.env.USE_REAL_CHAINLINK === 'true';

const SEPOLIA_ORIGIN_RELAY = USE_REAL_CHAINLINK 
  ? '0xD200bD254a182aa0aa77d71C504189fb92481315'
  : '0x46ad513300d508FB234fefD3ec1aB4162C547A57';

const SEPOLIA_MOCK_FEED = '0xE293955c98D37044400E71c445062d7cd967250c';
const REAL_CHAINLINK_ETH_USD = '0x694AA1769357215DE4FAC081bf1f309aDC325306';

const RPC_ENDPOINTS = [
  process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.org',
  'https://sepolia.drpc.org',
  'https://1rpc.io/sepolia',
];

const ORIGIN_RELAY_ABI = [
  'function relayLatestPrice() external',
  'function minUpdateInterval() external view returns (uint256)',
  'function lastUpdateTimestamp() external view returns (uint256)',
  'function getFeedMetadata() external view returns (string description, uint8 decimals, uint256 updateCount)',
  'event PriceUpdateEmitted(uint80 indexed roundId, int256 answer, uint256 updatedAt, uint8 decimals, string description, bytes32 messageHash, uint8 confidence)',
];

const AGGREGATOR_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function setPrice(int256 _price) external',
];

let currentRpcIndex = 0;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 10;
const UPDATE_INTERVAL_MS = 70000;
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const dataStr = Object.keys(data).length > 0 ? ' ' + JSON.stringify(data) : '';
  console.log(`[${timestamp}] [${level}] ${message}${dataStr}`);
}

function getProvider() {
  const rpc = RPC_ENDPOINTS[currentRpcIndex];
  log('DEBUG', `Using RPC: ${rpc}`);
  return new ethers.JsonRpcProvider(rpc, 11155111, { staticNetwork: true });
}

function rotateRpc() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  return getProvider();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBalance(wallet) {
  const balance = await wallet.provider.getBalance(wallet.address);
  const ethBalance = ethers.formatEther(balance);
  log('INFO', `Wallet balance: ${ethBalance} ETH`, { address: wallet.address });
  
  if (parseFloat(ethBalance) < 0.001) {
    log('WARN', 'Low balance warning! Need more Sepolia ETH for gas');
    return false;
  }
  return true;
}

async function getCurrentPrice(provider) {
  const feedAddress = USE_REAL_CHAINLINK ? REAL_CHAINLINK_ETH_USD : SEPOLIA_MOCK_FEED;
  const feed = new ethers.Contract(feedAddress, AGGREGATOR_ABI, provider);
  try {
    const [roundData, decimals] = await Promise.all([
      feed.latestRoundData(),
      feed.decimals(),
    ]);
    const price = Number(roundData[1]) / Math.pow(10, Number(decimals));
    return { price, roundId: roundData[0].toString(), rawPrice: roundData[1] };
  } catch (error) {
    log('ERROR', 'Failed to read current price', { error: error.message });
    return null;
  }
}

async function updateMockPrice(wallet) {
  const mockFeed = new ethers.Contract(SEPOLIA_MOCK_FEED, AGGREGATOR_ABI, wallet);
  
  try {
    const [roundData, decimals] = await Promise.all([
      mockFeed.latestRoundData(),
      mockFeed.decimals(),
    ]);
    
    const currentPrice = Number(roundData[1]);
    const variation = (Math.random() - 0.5) * 0.02;
    const newPrice = Math.floor(currentPrice * (1 + variation));
    
    log('INFO', 'Updating MockPriceFeed with simulated price variation');
    log('INFO', `Current: $${(currentPrice / 1e8).toFixed(2)} → New: $${(newPrice / 1e8).toFixed(2)}`);
    
    const tx = await mockFeed.setPrice(BigInt(newPrice));
    log('INFO', 'MockPriceFeed update submitted', { hash: tx.hash });
    
    const receipt = await tx.wait();
    log('INFO', 'MockPriceFeed updated successfully', { 
      hash: receipt.hash,
      gasUsed: receipt.gasUsed.toString()
    });
    
    return { success: true, newPrice: newPrice / 1e8 };
  } catch (error) {
    log('ERROR', 'Failed to update MockPriceFeed', { error: error.message });
    return { success: false };
  }
}

async function relayPrice(wallet, relay) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      log('INFO', `Attempting to relay price (attempt ${attempt}/${MAX_RETRIES})`);
      
      const gasEstimate = await relay.relayLatestPrice.estimateGas();
      const gasLimit = gasEstimate * 120n / 100n;
      
      const tx = await relay.relayLatestPrice({ gasLimit });
      log('INFO', `Transaction submitted`, { hash: tx.hash });
      
      const receipt = await tx.wait();
      log('INFO', `Transaction confirmed`, { 
        hash: receipt.hash, 
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });
      
      return { success: true, hash: receipt.hash };
    } catch (error) {
      log('ERROR', `Relay attempt ${attempt} failed`, { error: error.message });
      
      if (error.message.includes('UpdateTooFrequent') || error.message.includes('rate limit')) {
        log('WARN', 'Rate limited - waiting for next interval');
        return { success: false, rateLimited: true };
      }
      
      if (attempt < MAX_RETRIES) {
        rotateRpc();
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }
  
  return { success: false };
}

async function runRelayLoop() {
  log('INFO', '='.repeat(60));
  log('INFO', 'AUTOMATED PRICE RELAY WORKER STARTED');
  log('INFO', '='.repeat(60));
  log('INFO', `Origin Relay: ${SEPOLIA_ORIGIN_RELAY}`);
  log('INFO', `Mock Feed: ${SEPOLIA_MOCK_FEED}`);
  log('INFO', `Update Interval: ${UPDATE_INTERVAL_MS / 1000}s`);
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    log('ERROR', 'PRIVATE_KEY not found in environment');
    log('ERROR', 'Please set PRIVATE_KEY in your Replit secrets');
    process.exit(1);
  }
  
  let provider = getProvider();
  let wallet = new ethers.Wallet(privateKey, provider);
  let relay = new ethers.Contract(SEPOLIA_ORIGIN_RELAY, ORIGIN_RELAY_ABI, wallet);
  
  log('INFO', `Wallet address: ${wallet.address}`);
  
  const hasBalance = await checkBalance(wallet);
  if (!hasBalance) {
    log('WARN', 'Continuing anyway, but transactions may fail');
  }
  
  let relayCount = 0;
  
  while (true) {
    try {
      log('INFO', '-'.repeat(40));
      log('INFO', `Relay cycle #${++relayCount}`);
      
      const priceInfo = await getCurrentPrice(provider);
      if (priceInfo) {
        log('INFO', `Current price: $${priceInfo.price.toLocaleString()}`, { roundId: priceInfo.roundId });
      }
      
      if (!USE_REAL_CHAINLINK) {
        const mockUpdate = await updateMockPrice(wallet);
        if (!mockUpdate.success) {
          log('WARN', 'Failed to update mock price, trying relay anyway');
        }
        await sleep(2000);
      } else {
        log('INFO', 'Using REAL Chainlink feed - no mock updates needed');
      }
      
      const result = await relayPrice(wallet, relay);
      
      if (result.success) {
        consecutiveFailures = 0;
        log('INFO', 'Price relayed successfully to Reactive Network');
      } else if (result.rateLimited) {
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
        log('WARN', `Consecutive failures: ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`);
        
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          log('ERROR', 'Too many consecutive failures, exiting');
          process.exit(1);
        }
        
        provider = rotateRpc();
        wallet = new ethers.Wallet(privateKey, provider);
        relay = new ethers.Contract(SEPOLIA_ORIGIN_RELAY, ORIGIN_RELAY_ABI, wallet);
      }
      
      if (relayCount % 10 === 0) {
        await checkBalance(wallet);
      }
      
    } catch (error) {
      log('ERROR', 'Unexpected error in relay loop', { error: error.message });
      consecutiveFailures++;
      
      provider = rotateRpc();
      wallet = new ethers.Wallet(privateKey, provider);
      relay = new ethers.Contract(SEPOLIA_ORIGIN_RELAY, ORIGIN_RELAY_ABI, wallet);
    }
    
    log('INFO', `Waiting ${UPDATE_INTERVAL_MS / 1000}s until next relay...`);
    await sleep(UPDATE_INTERVAL_MS);
  }
}

process.on('SIGINT', () => {
  log('INFO', 'Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('INFO', 'Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

runRelayLoop().catch((error) => {
  log('ERROR', 'Fatal error', { error: error.message });
  process.exit(1);
});
