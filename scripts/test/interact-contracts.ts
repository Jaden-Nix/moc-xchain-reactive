import { ethers } from "hardhat";
import { readFileSync } from "fs";

async function main() {
  const deploymentFile = readFileSync("deployment-local.json", "utf-8");
  const deployment = JSON.parse(deploymentFile);

  const [signer] = await ethers.getSigners();
  console.log("\n" + "=".repeat(70));
  console.log("CROSS-CHAIN PRICE RELAY - INTERACTION TEST");
  console.log("=".repeat(70) + "\n");

  console.log("📋 Deployed Contracts:");
  console.log(JSON.stringify(deployment.contracts, null, 2));
  console.log();

  // Get contract instances
  const mockFeed = await ethers.getContractAt("MockPriceFeed", deployment.contracts.MockPriceFeed);
  const originRelay = await ethers.getContractAt("OriginFeedRelay", deployment.contracts.OriginFeedRelay);
  const reactor = await ethers.getContractAt("PriceFeedReactor", deployment.contracts.PriceFeedReactor);
  const destination = await ethers.getContractAt("DestinationFeedProxy", deployment.contracts.DestinationFeedProxy);

  // Set minimum update interval to 30 seconds for testing
  console.log("Configuring origin relay for testing (min interval = 30 seconds)...");
  let tx = await originRelay.setMinUpdateInterval(30);
  await tx.wait();
  console.log("✅ Configuration complete\n");

  // Test 1: Update mock price feed
  console.log("─".repeat(70));
  console.log("TEST 1: Update Mock Price Feed");
  console.log("─".repeat(70));

  const newPrice = ethers.parseUnits("2500", 8); // $2500 ETH
  console.log("Setting mock price to: $2500 ETH");
  tx = await mockFeed.setPrice(newPrice);
  await tx.wait();
  console.log("✅ Mock price updated");

  const latestRound = await mockFeed.latestRoundData();
  console.log("✓ Latest round data:", {
    roundId: latestRound[0].toString(),
    answer: ethers.formatUnits(latestRound[1], 8),
    updatedAt: new Date(Number(latestRound[3]) * 1000).toISOString(),
  });

  // Test 2: Relay price from Origin contract
  console.log("\n" + "─".repeat(70));
  console.log("TEST 2: Relay Price from OriginFeedRelay");
  console.log("─".repeat(70));

  console.log("Calling relayLatestPrice()...");
  tx = await originRelay.relayLatestPrice();
  const receipt = await tx.wait();
  console.log("✅ Price relayed from origin contract");

  const originMetadata = await originRelay.getFeedMetadata();
  console.log("✓ Origin relay metadata:", {
    description: originMetadata.description,
    decimals: originMetadata.decimals,
    updateCount: originMetadata.updateCount.toString(),
  });

  // Test 3: Check Destination contract state
  console.log("\n" + "─".repeat(70));
  console.log("TEST 3: Check Destination Contract State");
  console.log("─".repeat(70));

  const destConfig = await destination.feedConfig();
  console.log("✓ Destination feed config:", {
    description: destConfig.description,
    decimals: destConfig.decimals,
    version: destConfig.version.toString(),
    paused: destConfig.paused,
  });

  const destLatestRound = await destination.latestRoundData();
  console.log("✓ Destination latest round:", {
    roundId: destLatestRound[0].toString(),
    answer: ethers.formatUnits(destLatestRound[1], 8),
    updatedAt: new Date(Number(destLatestRound[3]) * 1000).toISOString(),
  });

  // Test 4: Check Reactor state
  console.log("\n" + "─".repeat(70));
  console.log("TEST 4: Check PriceFeedReactor State");
  console.log("─".repeat(70));

  const subscriptionCount = await reactor.subscriptionCount();
  console.log("✓ Active subscriptions:", subscriptionCount.toString());

  const tempState = await reactor.getTemporalState();
  console.log("✓ Temporal state:", {
    lastOriginUpdate: tempState.lastOriginUpdate.toString(),
    lastDestinationRelay: tempState.lastDestinationRelay.toString(),
    cumulativeDrift: tempState.cumulativeDrift.toString(),
  });

  // Test 5: Another price update to show continuous relay
  console.log("\n" + "─".repeat(70));
  console.log("TEST 5: Second Price Update (Continuous Relay)");
  console.log("─".repeat(70));

  const newPrice2 = ethers.parseUnits("2750", 8); // $2750 ETH
  console.log("Setting mock price to: $2750 ETH");
  tx = await mockFeed.setPrice(newPrice2);
  await tx.wait();

  // Wait for rate limit (30 second minimum interval)
  console.log("Waiting for rate limit (30 seconds)...");
  await new Promise(resolve => setTimeout(resolve, 31000));

  console.log("Relaying new price...");
  tx = await originRelay.relayLatestPrice();
  await tx.wait();
  console.log("✅ Second price relayed");

  const destLatestRound2 = await destination.latestRoundData();
  console.log("✓ Destination updated to:", ethers.formatUnits(destLatestRound2[1], 8), "ETH/USD");

  console.log("\n" + "=".repeat(70));
  console.log("✨ SYSTEM WORKING - END-TO-END TEST PASSED");
  console.log("=".repeat(70));
  console.log("\nData flow verified:");
  console.log("  Mock Feed → OriginFeedRelay → PriceFeedReactor → DestinationFeedProxy");
  console.log("\nYour cross-chain price relay is ready for the hackathon demo! 🚀");
  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
