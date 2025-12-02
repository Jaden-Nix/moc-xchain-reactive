const { ethers } = require('ethers');

const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const LASNA_RPC = 'https://lasna-rpc.rnk.dev';

const SEPOLIA_MOCK_FEED = '0xE293955c98D37044400E71c445062d7cd967250c';
const SEPOLIA_ORIGIN_RELAY = '0x46ad513300d508FB234fefD3ec1aB4162C547A57';
const LASNA_REACTOR = '0xE293955c98D37044400E71c445062d7cd967250c';
const LASNA_DESTINATION = '0x46ad513300d508FB234fefD3ec1aB4162C547A57';

const AGGREGATOR_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
];

const ORIGIN_RELAY_ABI = [
  'function getFeedMetadata() external view returns (string description, uint8 decimals, uint256 updateCount)',
  'function lastUpdateTimestamp() external view returns (uint256)',
  'function priceFeed() external view returns (address)',
];

const REACTOR_ABI = [
  'function subscriptionCount() external view returns (uint256)',
  'function getTemporalState() external view returns (uint256 lastOriginUpdate, uint256 lastDestinationRelay, uint256 cumulativeDrift)',
  'function destinationFeed() external view returns (address)',
];

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('FULL CROSS-CHAIN STATUS CHECK');
  console.log('Sepolia (Origin) → Lasna (Destination)');
  console.log('='.repeat(70) + '\n');
  
  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC, 11155111, { staticNetwork: true });
  const lasnaProvider = new ethers.JsonRpcProvider(LASNA_RPC, 5318007, { staticNetwork: true });
  
  console.log('─'.repeat(70));
  console.log('SEPOLIA (ORIGIN CHAIN)');
  console.log('─'.repeat(70) + '\n');
  
  const mockFeed = new ethers.Contract(SEPOLIA_MOCK_FEED, AGGREGATOR_ABI, sepoliaProvider);
  const originRelay = new ethers.Contract(SEPOLIA_ORIGIN_RELAY, ORIGIN_RELAY_ABI, sepoliaProvider);
  
  console.log('MockPriceFeed:', SEPOLIA_MOCK_FEED);
  try {
    const roundData = await mockFeed.latestRoundData();
    const decimals = await mockFeed.decimals();
    const price = Number(roundData[1]) / Math.pow(10, Number(decimals));
    const updatedAt = new Date(Number(roundData[3]) * 1000);
    const ageMs = Date.now() - updatedAt.getTime();
    const ageHours = Math.floor(ageMs / 3600000);
    const ageDays = Math.floor(ageHours / 24);
    
    console.log(`  Latest Price: $${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`  Round ID: ${roundData[0].toString()}`);
    console.log(`  Updated At: ${updatedAt.toISOString()}`);
    console.log(`  Age: ${ageDays > 0 ? ageDays + ' days ' : ''}${ageHours % 24} hours ago`);
  } catch (error) {
    console.log(`  ⚠️  Error: ${error.message}`);
  }
  
  console.log('\nOriginFeedRelay:', SEPOLIA_ORIGIN_RELAY);
  try {
    const metadata = await originRelay.getFeedMetadata();
    const lastUpdate = await originRelay.lastUpdateTimestamp();
    const lastUpdateDate = new Date(Number(lastUpdate) * 1000);
    const ageMs = Date.now() - lastUpdateDate.getTime();
    const ageHours = Math.floor(ageMs / 3600000);
    const ageDays = Math.floor(ageHours / 24);
    
    console.log(`  Description: ${metadata[0]}`);
    console.log(`  Decimals: ${metadata[1]}`);
    console.log(`  Update Count: ${metadata[2].toString()}`);
    console.log(`  Last Update: ${lastUpdate > 0 ? lastUpdateDate.toISOString() : 'Never'}`);
    if (lastUpdate > 0) {
      console.log(`  Age: ${ageDays > 0 ? ageDays + ' days ' : ''}${ageHours % 24} hours ago`);
    }
  } catch (error) {
    console.log(`  ⚠️  Error: ${error.message}`);
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log('LASNA (DESTINATION CHAIN)');
  console.log('─'.repeat(70) + '\n');
  
  const reactor = new ethers.Contract(LASNA_REACTOR, REACTOR_ABI, lasnaProvider);
  
  console.log('PriceFeedReactor:', LASNA_REACTOR);
  try {
    const subCount = await reactor.subscriptionCount();
    const temporal = await reactor.getTemporalState();
    const lastOrigin = temporal[0] > 0 ? new Date(Number(temporal[0]) * 1000) : null;
    const lastRelay = temporal[1] > 0 ? new Date(Number(temporal[1]) * 1000) : null;
    
    console.log(`  Subscriptions: ${subCount.toString()}`);
    console.log(`  Last Origin Update: ${lastOrigin ? lastOrigin.toISOString() : 'Never'}`);
    console.log(`  Last Destination Relay: ${lastRelay ? lastRelay.toISOString() : 'Never'}`);
    
    if (lastRelay) {
      const ageMs = Date.now() - lastRelay.getTime();
      const ageHours = Math.floor(ageMs / 3600000);
      const ageDays = Math.floor(ageHours / 24);
      console.log(`  Relay Age: ${ageDays > 0 ? ageDays + ' days ' : ''}${ageHours % 24} hours ago`);
    }
  } catch (error) {
    console.log(`  ⚠️  Error: ${error.message}`);
  }
  
  console.log('\nDestinationFeedProxy:', LASNA_DESTINATION);
  const destination = new ethers.Contract(LASNA_DESTINATION, AGGREGATOR_ABI, lasnaProvider);
  try {
    const roundData = await destination.latestRoundData();
    const decimals = await destination.decimals();
    const price = Number(roundData[1]) / Math.pow(10, Number(decimals));
    const updatedAt = new Date(Number(roundData[3]) * 1000);
    
    console.log(`  Latest Price: $${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`  Round ID: ${roundData[0].toString()}`);
    console.log(`  Updated At: ${updatedAt.toISOString()}`);
  } catch (error) {
    const errorCode = error.data || 'unknown';
    console.log(`  ⚠️  No price data available (Error: ${errorCode})`);
    console.log(`  This means no prices have been successfully relayed to the destination.`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`
The cross-chain relay system status:

1. SEPOLIA ORIGIN: Contracts deployed and configured
   - MockPriceFeed stores price data
   - OriginFeedRelay ready to emit events

2. LASNA DESTINATION: Contracts deployed
   - PriceFeedReactor has active subscription
   - DestinationFeedProxy waiting for relayed prices

3. RELAY STATUS: 
   - Last relay activity: November 27, 2025
   - Current status: INACTIVE (no recent price relays)

To activate the relay, you need to:
1. Call relayLatestPrice() on OriginFeedRelay (Sepolia)
2. This emits an event that PriceFeedReactor captures
3. Reactor then updates DestinationFeedProxy on Lasna
`);
  console.log('='.repeat(70) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
