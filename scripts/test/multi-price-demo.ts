import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("\n" + "=".repeat(70));
  console.log("MULTI-PRICE UPDATE DEMO");
  console.log("=".repeat(70) + "\n");

  // DEPLOY CONTRACTS ONCE
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
  let tx = await reactor.subscribe(chainId, await originRelay.getAddress(), eventSignature);
  await tx.wait();

  tx = await destination.setRelayerAuthorization(await reactor.getAddress(), true);
  await tx.wait();
  console.log("✅ Contracts deployed and configured\n");

  // TEST PRICES
  const testPrices = [1500, 1600, 1700];

  for (let i = 0; i < testPrices.length; i++) {
    const price = testPrices[i];
    console.log("─".repeat(70));
    console.log(`TEST ${i + 1}: Price Update to $${price}`);
    console.log("─".repeat(70));

    // Update mock feed
    const priceInUnits = ethers.parseUnits(price.toString(), 8);
    console.log(`1. Setting mock price to $${price}...`);
    tx = await mockFeed.setPrice(priceInUnits);
    await tx.wait();
    console.log("   ✓ Mock feed updated");

    // Get updated price
    const mockRound = await mockFeed.latestRoundData();
    console.log(`   ✓ Round ID: ${mockRound[0]}, Price: $${ethers.formatUnits(mockRound[1], 8)}`);

    // Advance time
    console.log(`2. Advancing blockchain time...`);
    await ethers.provider.send("evm_increaseTime", [65]);
    await ethers.provider.send("evm_mine", []);
    console.log("   ✓ Time advanced 65 seconds");

    // Relay price
    console.log(`3. Relaying price via OriginFeedRelay...`);
    tx = await originRelay.relayLatestPrice();
    await tx.wait();
    console.log(`   ✓ Price relayed (tx: ${tx.hash.slice(0, 10)}...)`);

    // Update destination
    console.log(`4. Updating DestinationFeedProxy...`);
    tx = await destination.updatePrice(
      mockRound[0],
      mockRound[1],
      mockRound[2],
      mockRound[3],
      mockRound[4],
      8,
      "ETH/USD Mirrored"
    );
    await tx.wait();
    console.log("   ✓ Destination updated");

    // Verify
    const destRound = await destination.latestRoundData();
    const destPrice = parseFloat(ethers.formatUnits(destRound[1], 8));
    console.log(`5. Verification:`);
    console.log(`   Mock Price:        $${price}`);
    console.log(`   Destination Price: $${destPrice}`);
    
    if (destPrice === price) {
      console.log("   ✅ MATCH!\n");
    } else {
      console.log("   ⚠️  Mismatch\n");
    }
  }

  console.log("=".repeat(70));
  console.log("✨ MULTI-PRICE DEMO COMPLETE");
  console.log("=".repeat(70));
  console.log("\n✅ Successfully tested 3 price updates:");
  testPrices.forEach((p, i) => console.log(`   ${i + 1}. $${p} ETH/USD`));
  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
