import { ethers } from "hardhat";

const CHAINLINK_FEEDS = {
  'BTC/USD': '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
  'LINK/USD': '0xc59E3633BAAC79493d908e63626716e204A45EdF',
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYING MULTI-FEED ORIGIN RELAYS");
  console.log("=".repeat(70));
  console.log(`Network: Sepolia (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  const deployedContracts: Record<string, string> = {};

  for (const [feedName, feedAddress] of Object.entries(CHAINLINK_FEEDS)) {
    console.log("─".repeat(70));
    console.log(`DEPLOYING OriginFeedRelay for ${feedName}`);
    console.log("─".repeat(70));
    console.log(`Chainlink Feed: ${feedAddress}`);

    const aggregatorAbi = [
      'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
      'function decimals() external view returns (uint8)',
      'function description() external view returns (string)',
    ];
    
    const feed = new ethers.Contract(feedAddress, aggregatorAbi, deployer);
    
    try {
      const description = await feed.description();
      const [, answer] = await feed.latestRoundData();
      const decimals = await feed.decimals();
      const price = Number(answer) / Math.pow(10, Number(decimals));
      console.log(`✅ Feed verified: ${description}`);
      console.log(`   Current price: $${price.toLocaleString()}\n`);
    } catch (error) {
      console.log(`⚠️ Could not verify feed, continuing anyway...\n`);
    }

    const OriginFeedRelay = await ethers.getContractFactory("OriginFeedRelay");
    const relay = await OriginFeedRelay.deploy(feedAddress, feedName, {
      gasLimit: 2000000,
    });
    await relay.waitForDeployment();
    
    const relayAddr = await relay.getAddress();
    const tx = relay.deploymentTransaction();
    console.log(`✅ OriginFeedRelay deployed: ${relayAddr}`);
    console.log(`   TX: ${tx?.hash}\n`);

    try {
      const setIntervalTx = await relay.setMinUpdateInterval(60, { gasLimit: 100000 });
      await setIntervalTx.wait();
      console.log(`✅ Min update interval set to 60s\n`);
    } catch (e) {
      console.log(`⚠️ Could not set interval (may already be default)\n`);
    }

    deployedContracts[feedName] = relayAddr;
  }

  console.log("=".repeat(70));
  console.log("MULTI-FEED DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  console.log("\n📋 DEPLOYED CONTRACTS:");
  for (const [name, addr] of Object.entries(deployedContracts)) {
    console.log(`   ${name}: ${addr}`);
  }
  console.log("\n");

  const fs = await import('fs');
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    contracts: deployedContracts,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync('deployment-multi-feed.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Saved to deployment-multi-feed.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
