import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

dotenv.config();

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("LOCAL BLOCKCHAIN DEPLOYMENT - COMPLETE SYSTEM");
  console.log("=".repeat(70) + "\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Network:", (await ethers.provider.getNetwork()).name);
  console.log("🔑 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy Origin Feed Relay
  console.log("─".repeat(70));
  console.log("STEP 1: Deploying OriginFeedRelay");
  console.log("─".repeat(70));

  const OriginFeedRelay = await ethers.getContractFactory("OriginFeedRelay");
  
  // Use a mock price feed address for local testing
  const mockPriceFeed = deployer.address; // Just use deployer as placeholder
  const feedDescription = "ETH/USD Price Feed Relay";

  console.log("Deploying OriginFeedRelay with:");
  console.log("  - Price Feed (mock):", mockPriceFeed);
  console.log("  - Description:", feedDescription);

  const originRelay = await OriginFeedRelay.deploy(mockPriceFeed, feedDescription);
  await originRelay.waitForDeployment();
  const originAddress = await originRelay.getAddress();
  console.log("✅ OriginFeedRelay deployed to:", originAddress);

  // Deploy Reactive Contract
  console.log("\n" + "─".repeat(70));
  console.log("STEP 2: Deploying PriceFeedReactor");
  console.log("─".repeat(70));

  const PriceFeedReactor = await ethers.getContractFactory("PriceFeedReactor");
  const reactor = await PriceFeedReactor.deploy();
  await reactor.waitForDeployment();
  const reactorAddress = await reactor.getAddress();
  console.log("✅ PriceFeedReactor deployed to:", reactorAddress);

  // Configure subscription
  console.log("\nConfiguring subscription...");
  const eventSignature = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  const tx1 = await reactor.subscribe(chainId, originAddress, eventSignature);
  await tx1.wait();
  console.log("✅ Subscription configured");
  console.log("  - Chain ID:", chainId);
  console.log("  - Origin Contract:", originAddress);
  console.log("  - Event Signature:", eventSignature);

  // Deploy Destination Feed Proxy
  console.log("\n" + "─".repeat(70));
  console.log("STEP 3: Deploying DestinationFeedProxy");
  console.log("─".repeat(70));

  const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
  const decimals = 8;
  const description = "ETH/USD Mirrored Price Feed";

  console.log("Deploying DestinationFeedProxy with:");
  console.log("  - Decimals:", decimals);
  console.log("  - Description:", description);

  const feedProxy = await DestinationFeedProxy.deploy(decimals, description);
  await feedProxy.waitForDeployment();
  const proxyAddress = await feedProxy.getAddress();
  console.log("✅ DestinationFeedProxy deployed to:", proxyAddress);

  // Authorize reactor as relayer
  console.log("\nAuthorizing PriceFeedReactor as relayer...");
  const tx2 = await feedProxy.setRelayerAuthorization(reactorAddress, true);
  await tx2.wait();
  console.log("✅ PriceFeedReactor authorized as relayer");

  // Save deployment info
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT COMPLETE ✨");
  console.log("=".repeat(70) + "\n");

  const deploymentInfo = {
    network: {
      name: (await ethers.provider.getNetwork()).name,
      chainId: chainId,
    },
    deployer: deployer.address,
    contracts: {
      OriginFeedRelay: originAddress,
      PriceFeedReactor: reactorAddress,
      DestinationFeedProxy: proxyAddress,
    },
    deployment_timestamp: new Date().toISOString(),
  };

  console.log("📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const deploymentPath = join(__dirname, "../..", "deployment-local.json");
  writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to: deployment-local.json");

  console.log("\n" + "=".repeat(70));
  console.log("🎯 NEXT STEPS FOR TESTING:");
  console.log("=".repeat(70));
  console.log("1. Contracts are deployed and ready!");
  console.log("2. Use deployment-local.json to get contract addresses");
  console.log("3. Call emitPrice() on OriginFeedRelay to test the system");
  console.log("4. Monitor events in the contracts");
  console.log("5. Verify data flows through: Origin → Reactor → Destination");
  console.log("=".repeat(70) + "\n");

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
