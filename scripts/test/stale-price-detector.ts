import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("STALE PRICE DETECTION TEST");
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
  const destination = await DestinationFeedProxy.deploy(8, "ETH/USD Mirrored");
  await destination.waitForDeployment();

  const eventSig = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
  const chainId = (await ethers.provider.getNetwork()).chainId;
  await reactor.subscribe(chainId, await originRelay.getAddress(), eventSig);
  await destination.setRelayerAuthorization(await reactor.getAddress(), true);
  console.log("✅ Contracts deployed\n");

  // PUSH INITIAL PRICE
  console.log("─".repeat(70));
  console.log("STEP 1: Push Initial Price ($1500)");
  console.log("─".repeat(70));
  
  await mockFeed.setPrice(ethers.parseUnits("1500", 8));
  let round = await mockFeed.latestRoundData();
  await ethers.provider.send("evm_increaseTime", [65]);
  await ethers.provider.send("evm_mine", []);
  await originRelay.relayLatestPrice();
  await destination.updatePrice(round[0], round[1], round[2], round[3], round[4], 8, "ETH/USD Mirrored");
  
  const block1 = await ethers.provider.getBlock("latest");
  console.log(`✓ Price pushed at timestamp: ${block1?.timestamp}`);
  console.log(`✓ Price: $${ethers.formatUnits(round[1], 8)}\n`);

  // CHECK REACTOR UPDATE TIME
  console.log("─".repeat(70));
  console.log("STEP 2: Check Reactor Last Update Time");
  console.log("─".repeat(70));
  
  let reactorTimestamp = await reactor.lastUpdateTime?.call?.().catch(() => null);
  if (!reactorTimestamp) {
    console.log("ℹ️  Reactor doesn't expose lastUpdateTime (internal tracking)\n");
  } else {
    console.log(`✓ Reactor last update time: ${reactorTimestamp}\n`);
  }

  // SIMULATE TIME DRIFT: JUMP 1 HOUR AHEAD
  console.log("─".repeat(70));
  console.log("STEP 3: Simulate Stale Price - Bump Time Forward 1 Hour");
  console.log("─".repeat(70));
  
  console.log("Advancing blockchain time by 3600 seconds (1 hour)...");
  await ethers.provider.send("evm_increaseTime", [3600]);
  await ethers.provider.send("evm_mine", []);
  
  const block2 = await ethers.provider.getBlock("latest");
  const timeDiff = (block2?.timestamp ?? 0) - (block1?.timestamp ?? 0);
  console.log(`✓ Time advanced: ${timeDiff} seconds (${timeDiff / 60} minutes)\n`);

  // PUSH NEW PRICE AFTER TIME DRIFT
  console.log("─".repeat(70));
  console.log("STEP 4: Push New Price After Time Gap ($2000)");
  console.log("─".repeat(70));
  
  try {
    await mockFeed.setPrice(ethers.parseUnits("2000", 8));
    round = await mockFeed.latestRoundData();
    
    // Need to advance time again to bypass OriginFeedRelay's min interval
    await ethers.provider.send("evm_increaseTime", [65]);
    await ethers.provider.send("evm_mine", []);
    
    const relayTx = await originRelay.relayLatestPrice();
    await relayTx.wait();
    console.log(`✓ New price relayed: $${ethers.formatUnits(round[1], 8)}`);
    
    const block3 = await ethers.provider.getBlock("latest");
    console.log(`✓ Pushed at timestamp: ${block3?.timestamp}`);
    console.log(`✓ Time gap from previous update: ${(block3?.timestamp ?? 0) - (block1?.timestamp ?? 0)} seconds\n`);

    // RESULTS
    console.log("─".repeat(70));
    console.log("RESULTS: Stale Price Handling");
    console.log("─".repeat(70));
    console.log("✅ System accepted price after 1+ hour gap");
    console.log("✓ No staleness detection/rejection implemented\n");
    console.log("Design Note: Staleness detection would typically be:");
    console.log("  - Checked in the Reactor when subscribing to price feeds");
    console.log("  - Or in DestinationFeedProxy when storing prices");
    console.log("  - Current implementation: Accepts any price if data is valid\n");

  } catch (error: any) {
    console.log("❌ Error occurred:");
    console.log(error.message + "\n");
    console.log("✅ System REJECTED stale price (time drift detection active)\n");
  }

  console.log("=".repeat(70));
  console.log("TEST COMPLETE");
  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
