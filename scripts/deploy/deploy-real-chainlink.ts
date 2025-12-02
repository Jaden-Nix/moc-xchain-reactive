import { ethers } from "hardhat";

const REAL_CHAINLINK_FEEDS = {
  'ETH/USD': '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  'BTC/USD': '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
  'LINK/USD': '0xc59E3633BAAC79493d908e63626716e204A45EdF',
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYING ORIGIN RELAY FOR REAL CHAINLINK FEED");
  console.log("=".repeat(70));
  console.log(`Network: Sepolia`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (Number(network.chainId) !== 11155111) {
    console.error("❌ ERROR: Must deploy to Sepolia network");
    console.error("Use: npx hardhat run scripts/deploy/deploy-real-chainlink.ts --network sepolia");
    process.exit(1);
  }

  const feedToUse = process.env.FEED || 'ETH/USD';
  const chainlinkFeedAddress = REAL_CHAINLINK_FEEDS[feedToUse as keyof typeof REAL_CHAINLINK_FEEDS];
  
  if (!chainlinkFeedAddress) {
    console.error(`❌ ERROR: Unknown feed ${feedToUse}`);
    console.error(`Available feeds: ${Object.keys(REAL_CHAINLINK_FEEDS).join(', ')}`);
    process.exit(1);
  }

  console.log("─".repeat(70));
  console.log(`DEPLOYING OriginFeedRelay for ${feedToUse}`);
  console.log("─".repeat(70));
  console.log(`Real Chainlink Feed: ${chainlinkFeedAddress}`);
  console.log(`This will read LIVE prices from official Chainlink oracle\n`);

  const chainlinkFeed = new ethers.Contract(chainlinkFeedAddress, [
    'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
    'function decimals() external view returns (uint8)',
    'function description() external view returns (string)',
  ], deployer);

  console.log("Verifying Chainlink feed connectivity...");
  const [roundData, decimals, description] = await Promise.all([
    chainlinkFeed.latestRoundData(),
    chainlinkFeed.decimals(),
    chainlinkFeed.description(),
  ]);
  
  const price = Number(roundData[1]) / Math.pow(10, Number(decimals));
  console.log(`✅ Feed verified: ${description}`);
  console.log(`   Current price: $${price.toLocaleString()}`);
  console.log(`   Round ID: ${roundData[0].toString()}\n`);

  console.log("Deploying OriginFeedRelay...");
  const OriginFeedRelay = await ethers.getContractFactory("OriginFeedRelay");
  const originRelay = await OriginFeedRelay.deploy(
    chainlinkFeedAddress, 
    `${feedToUse} Real Chainlink Relay`
  );
  await originRelay.waitForDeployment();
  const originAddr = await originRelay.getAddress();
  const deployTx = originRelay.deploymentTransaction();
  
  console.log(`\n✅ OriginFeedRelay deployed!`);
  console.log(`   Address: ${originAddr}`);
  console.log(`   TX Hash: ${deployTx?.hash}`);

  console.log("\nSetting minimum update interval to 60 seconds...");
  const tx = await originRelay.setMinUpdateInterval(60);
  await tx.wait();
  console.log(`✅ Configured (TX: ${tx.hash})`);

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT COMPLETE - REAL CHAINLINK FEED");
  console.log("=".repeat(70));
  console.log(`
📋 DEPLOYED CONTRACT:
   OriginFeedRelay: ${originAddr}
   
📊 CONNECTED TO:
   Chainlink ${feedToUse}: ${chainlinkFeedAddress}
   Current Price: $${price.toLocaleString()}
   
📦 TRANSACTION:
   Deploy TX: ${deployTx?.hash}
   
🔗 VERIFY:
   https://sepolia.etherscan.io/address/${originAddr}

⚡ NEXT STEPS:
   1. Deploy/update Lasna contracts with this origin relay address
   2. Update relay worker with new address: ${originAddr}
   3. Run: ORIGIN_RELAY_ADDR=${originAddr} npx hardhat run scripts/deploy/02_deploy_reactive_lasna.ts --network lasna
`);
  console.log("=".repeat(70) + "\n");

  console.log("Saving deployment info to deployment-real-chainlink.json...");
  const fs = await import('fs');
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    feed: feedToUse,
    chainlinkFeedAddress,
    originRelayAddress: originAddr,
    deployTxHash: deployTx?.hash,
    timestamp: new Date().toISOString(),
    currentPrice: price,
  };
  fs.writeFileSync('deployment-real-chainlink.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Saved to deployment-real-chainlink.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
