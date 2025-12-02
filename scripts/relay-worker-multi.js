const { ethers } = require('ethers');
require('dotenv').config();

const FEEDS = {
  'ETH/USD': {
    chainlinkFeed: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    originRelay: '0xee481f6Fad0209880D61a072Ee7307CDC74dCDf8',
    lasnaReactor: '0x7d6a70f8303385D182ABAd16a8159B6A27FE6B25',
    lasnaDestination: '0x9Fd448E930cE937d8dDCdF6e4F5bE8B9C6aF3581',
  },
  'BTC/USD': {
    chainlinkFeed: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
    originRelay: '0x12B74592d6077C1E52a814118169b1A7B78DC4F2',
    lasnaReactor: '0xe8B05809c380e7E52bd68b113A737241678c202C',
    lasnaDestination: '0x3C828678De4F4184952D66f2d0260B5db2e0f522',
  },
  'LINK/USD': {
    chainlinkFeed: '0xc59E3633BAAC79493d908e63626716e204A45EdF',
    originRelay: '0x760FBf81b2FE506dEc35dA1385E65C79A8fD12FB',
    lasnaReactor: '0x7a0D8E6FDd1760C61a9f422036Db098E4D3ae659',
    lasnaDestination: '0x3E6114bdd39db5c624C67FbCEDe7B3053E621915',
  },
};

const RPC_ENDPOINTS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.org',
  'https://sepolia.drpc.org',
];

const ORIGIN_RELAY_ABI = [
  'function relayLatestPrice() external',
  'function minUpdateInterval() external view returns (uint256)',
  'function lastUpdateTimestamp() external view returns (uint256)',
  'event PriceUpdateEmitted(uint80 indexed roundId, int256 answer, uint256 updatedAt, uint8 decimals, string description, bytes32 messageHash, uint8 confidence)',
];

const AGGREGATOR_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
];

let currentRpcIndex = 0;
const UPDATE_INTERVAL_MS = 90000;
const STAGGER_DELAY_MS = 5000;

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const dataStr = Object.keys(data).length > 0 ? ' ' + JSON.stringify(data) : '';
  console.log(`[${timestamp}] [${level}] ${message}${dataStr}`);
}

function getProvider() {
  const rpc = RPC_ENDPOINTS[currentRpcIndex];
  return new ethers.JsonRpcProvider(rpc, 11155111, { staticNetwork: true });
}

function rotateRpc() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  return getProvider();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getChainlinkPrice(provider, feedAddress) {
  const feed = new ethers.Contract(feedAddress, AGGREGATOR_ABI, provider);
  try {
    const [roundData, decimals] = await Promise.all([
      feed.latestRoundData(),
      feed.decimals(),
    ]);
    const price = Number(roundData[1]) / Math.pow(10, Number(decimals));
    return { price, roundId: roundData[0].toString() };
  } catch (error) {
    return null;
  }
}

async function relayFeed(wallet, feedName, feedConfig) {
  const relay = new ethers.Contract(feedConfig.originRelay, ORIGIN_RELAY_ABI, wallet);
  
  try {
    const priceInfo = await getChainlinkPrice(wallet.provider, feedConfig.chainlinkFeed);
    if (priceInfo) {
      log('INFO', `${feedName}: Current price $${priceInfo.price.toLocaleString()}`, { roundId: priceInfo.roundId });
    }
    
    const gasEstimate = await relay.relayLatestPrice.estimateGas();
    const gasLimit = gasEstimate * 120n / 100n;
    
    const tx = await relay.relayLatestPrice({ gasLimit });
    log('INFO', `${feedName}: TX submitted`, { hash: tx.hash.slice(0, 20) + '...' });
    
    const receipt = await tx.wait();
    log('INFO', `${feedName}: Confirmed`, { 
      gasUsed: receipt.gasUsed.toString(),
      block: receipt.blockNumber
    });
    
    return { success: true, hash: receipt.hash };
  } catch (error) {
    if (error.message.includes('execution reverted') || error.message.includes('no data')) {
      log('DEBUG', `${feedName}: Skipped (no new Chainlink data)`);
      return { success: true, skipped: true };
    }
    log('ERROR', `${feedName}: Failed`, { error: error.message.slice(0, 80) });
    return { success: false };
  }
}

async function runMultiFeedLoop() {
  log('INFO', '='.repeat(60));
  log('INFO', 'MULTI-FEED PRICE RELAY WORKER');
  log('INFO', '='.repeat(60));
  log('INFO', `Feeds: ${Object.keys(FEEDS).join(', ')}`);
  log('INFO', `Update Interval: ${UPDATE_INTERVAL_MS / 1000}s`);
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    log('ERROR', 'PRIVATE_KEY not found');
    process.exit(1);
  }
  
  let provider = getProvider();
  let wallet = new ethers.Wallet(privateKey, provider);
  
  const balance = await provider.getBalance(wallet.address);
  log('INFO', `Wallet: ${wallet.address}`);
  log('INFO', `Balance: ${ethers.formatEther(balance)} ETH`);
  
  let cycleCount = 0;
  
  while (true) {
    log('INFO', '-'.repeat(50));
    log('INFO', `Relay cycle #${++cycleCount}`);
    
    for (const [feedName, config] of Object.entries(FEEDS)) {
      try {
        await relayFeed(wallet, feedName, config);
      } catch (error) {
        log('ERROR', `${feedName}: Unexpected error`, { error: error.message });
        provider = rotateRpc();
        wallet = new ethers.Wallet(privateKey, provider);
      }
      
      await sleep(STAGGER_DELAY_MS);
    }
    
    if (cycleCount % 5 === 0) {
      const bal = await provider.getBalance(wallet.address);
      log('INFO', `Balance check: ${ethers.formatEther(bal)} ETH`);
    }
    
    log('INFO', `Next cycle in ${UPDATE_INTERVAL_MS / 1000}s...`);
    await sleep(UPDATE_INTERVAL_MS);
  }
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

runMultiFeedLoop().catch((error) => {
  log('ERROR', 'Fatal error', { error: error.message });
  process.exit(1);
});
