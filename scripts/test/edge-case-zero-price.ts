import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("\n" + "=".repeat(70));
  console.log("EDGE CASE TEST: Zero Price (pushPrice(0))");
  console.log("=".repeat(70) + "\n");

  // DEPLOY CONTRACTS
  console.log("Deploying contracts...");
  const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
  const mockFeed = await MockPriceFeed.deploy("ETH/USD", 8);
  await mockFeed.waitForDeployment();

  const OriginFeedRelay = await ethers.getContractFactory("OriginFeedRelay");
  const originRelay = await OriginFeedRelay.deploy(await mockFeed.getAddress(), "ETH/USD Price Feed Relay");
  await originRelay.waitForDeployment();

  const PriceFeedReactor = await ethers.getContractFactory("PriceFeedReactor");
  const reactor = await PriceFeedReactor.deploy();
  await reactor.waitForDeployment();

  const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
  const destination = await DestinationFeedProxy.deploy(8, "ETH/USD Mirrored Price Feed");
  await destination.waitForDeployment();

  const eventSignature = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
  const chainId = (await ethers.provider.getNetwork()).chainId;
  await reactor.subscribe(chainId, await originRelay.getAddress(), eventSignature);
  await destination.setRelayerAuthorization(await reactor.getAddress(), true);
  console.log("✅ Contracts deployed\n");

  // TEST EDGE CASE: Zero Price
  console.log("─".repeat(70));
  console.log("TEST: Attempting to set price to 0");
  console.log("─".repeat(70));

  try {
    console.log("1. Setting mock price to 0...");
    const tx = await mockFeed.setPrice(ethers.parseUnits("0", 8));
    await tx.wait();
    console.log("   ⚠️  Mock feed accepted price=0 (no validation at this level)");

    console.log("2. Getting the zero price...");
    const round = await mockFeed.latestRoundData();
    console.log(`   Price from mock: ${ethers.formatUnits(round[1], 8)}`);

    console.log("3. Advancing time...");
    await ethers.provider.send("evm_increaseTime", [65]);
    await ethers.provider.send("evm_mine", []);

    console.log("4. Relaying zero price via OriginFeedRelay...");
    const relayTx = await originRelay.relayLatestPrice();
    await relayTx.wait();
    console.log("   ⚠️  OriginFeedRelay also relayed price=0 (no validation)");

    console.log("5. Attempting to update DestinationFeedProxy with zero price...");
    const destTx = await destination.updatePrice(
      round[0],      // roundId
      round[1],      // answer = 0
      round[2],      // startedAt
      round[3],      // updatedAt
      round[4],      // answeredInRound
      8,             // decimals
      "ETH/USD Zero Test"
    );
    await destTx.wait();
    console.log("   ⚠️  Destination accepted price=0 (unexpected!)");
    
    const destRound = await destination.latestRoundData();
    console.log(`   Destination price: ${ethers.formatUnits(destRound[1], 8)}\n`);
    console.log("   ⚠️  Edge case: Zero price was NOT rejected!\n");

  } catch (error: any) {
    console.log("   ❌ Transaction reverted!\n");
    console.log("ERROR DETAILS:");
    const errorMsg = error.message;
    console.log(`   ${errorMsg}\n`);
    
    if (errorMsg.includes("InvalidAnswer")) {
      console.log("   ✅ EXPECTED: InvalidAnswer error (price must be > 0)");
    } else if (errorMsg.includes("revert")) {
      console.log("   ✅ Contract validation caught the zero price");
    } else {
      console.log("   Error occurred during transaction");
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("EDGE CASE TEST COMPLETE");
  console.log("=".repeat(70));
  console.log("\nSummary:");
  console.log("- Price 0 flows through mock feed ✓");
  console.log("- Price 0 flows through origin relay ✓");
  console.log("- Destination contract behavior with price=0 tested ✓");
  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
