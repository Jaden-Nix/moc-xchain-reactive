const { ethers } = require('ethers');

const LASNA_RPC = 'https://lasna-rpc.rnk.dev';
const DESTINATION_PROXY = '0x02BE5025B416Ca3c7e2b5fbC6c9AbFe8669Ba574';
const REACTOR = '0xe7d63C8dcfe109fc617DCcDe1799F38D13d17398';

const DESTINATION_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
  'function feedConfig() external view returns (string description, uint8 decimals, uint256 version, bool paused)',
  'function lastUpdateTimestamp() external view returns (uint256)',
];

const REACTOR_ABI = [
  'function subscriptionCount() external view returns (uint256)',
  'function getTemporalState() external view returns (uint256 lastOriginUpdate, uint256 lastDestinationRelay, uint256 cumulativeDrift)',
];

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('LASNA DESTINATION CONTRACT STATUS CHECK');
  console.log('='.repeat(70) + '\n');
  
  const provider = new ethers.JsonRpcProvider(LASNA_RPC, 5318007, { staticNetwork: true });
  
  console.log('Checking Lasna network connectivity...');
  const blockNumber = await provider.getBlockNumber();
  console.log(`✅ Connected to Lasna - Block #${blockNumber}\n`);
  
  console.log('─'.repeat(70));
  console.log('DESTINATION FEED PROXY STATUS');
  console.log('─'.repeat(70));
  console.log(`Address: ${DESTINATION_PROXY}\n`);
  
  const destination = new ethers.Contract(DESTINATION_PROXY, DESTINATION_ABI, provider);
  
  try {
    const config = await destination.feedConfig();
    console.log('Feed Configuration:');
    console.log(`  Description: ${config.description || config[0]}`);
    console.log(`  Decimals: ${config.decimals || config[1]}`);
    console.log(`  Version: ${config.version?.toString() || config[2]?.toString()}`);
    console.log(`  Paused: ${config.paused ?? config[3]}`);
    console.log();
  } catch (error) {
    console.log('  ⚠️  Could not read feed config:', error.message);
  }
  
  try {
    const latestRound = await destination.latestRoundData();
    const decimals = await destination.decimals();
    
    const roundId = latestRound[0].toString();
    const answer = Number(latestRound[1]) / Math.pow(10, Number(decimals));
    const startedAt = new Date(Number(latestRound[2]) * 1000);
    const updatedAt = new Date(Number(latestRound[3]) * 1000);
    const answeredInRound = latestRound[4].toString();
    
    const now = Date.now();
    const ageMs = now - updatedAt.getTime();
    const ageMinutes = Math.floor(ageMs / 60000);
    const ageHours = Math.floor(ageMinutes / 60);
    
    console.log('Latest Round Data:');
    console.log(`  Round ID: ${roundId}`);
    console.log(`  Price: $${answer.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`);
    console.log(`  Updated At: ${updatedAt.toISOString()}`);
    console.log(`  Age: ${ageHours > 0 ? ageHours + ' hours ' : ''}${ageMinutes % 60} minutes ago`);
    console.log(`  Answered In Round: ${answeredInRound}`);
    console.log();
    
    if (ageMinutes < 60) {
      console.log('✅ ACTIVE: Price feed is receiving recent updates');
    } else if (ageMinutes < 1440) {
      console.log('⚠️  STALE: Price feed has not been updated in over an hour');
    } else {
      console.log('❌ INACTIVE: Price feed has not been updated in over 24 hours');
    }
  } catch (error) {
    console.log('  ⚠️  Could not read latest round data:', error.message);
    console.log('  This may mean no prices have been relayed yet.');
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log('PRICE FEED REACTOR STATUS');
  console.log('─'.repeat(70));
  console.log(`Address: ${REACTOR}\n`);
  
  const reactor = new ethers.Contract(REACTOR, REACTOR_ABI, provider);
  
  try {
    const subCount = await reactor.subscriptionCount();
    console.log(`Active Subscriptions: ${subCount.toString()}`);
  } catch (error) {
    console.log('  ⚠️  Could not read subscription count:', error.message);
  }
  
  try {
    const temporal = await reactor.getTemporalState();
    const lastOrigin = new Date(Number(temporal[0]) * 1000);
    const lastRelay = new Date(Number(temporal[1]) * 1000);
    const drift = temporal[2].toString();
    
    console.log('Temporal State:');
    console.log(`  Last Origin Update: ${temporal[0] > 0 ? lastOrigin.toISOString() : 'Never'}`);
    console.log(`  Last Destination Relay: ${temporal[1] > 0 ? lastRelay.toISOString() : 'Never'}`);
    console.log(`  Cumulative Drift: ${drift}ms`);
  } catch (error) {
    console.log('  ⚠️  Could not read temporal state:', error.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('STATUS CHECK COMPLETE');
  console.log('='.repeat(70) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
