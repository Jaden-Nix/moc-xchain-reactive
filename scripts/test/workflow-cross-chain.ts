import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("CROSS-CHAIN WORKFLOW TEST");
  console.log("=".repeat(70));
  console.log("This script tests 3 price updates across Sepolia and Lasna\n");

  // Get contract addresses from command line or env
  const mockFeedAddr = process.argv[2];
  const originRelayAddr = process.argv[3];

  if (!mockFeedAddr || !originRelayAddr) {
    console.error("❌ ERROR: Must provide contract addresses");
    console.error("Usage: npx hardhat run scripts/test/workflow-cross-chain.ts --network sepolia <mockFeedAddr> <originRelayAddr>\n");
    process.exit(1);
  }

  console.log(`MockPriceFeed (Sepolia):   ${mockFeedAddr}`);
  console.log(`OriginRelay (Sepolia):     ${originRelayAddr}\n`);

  const [signer] = await ethers.getSigners();

  // Get contract instances
  const mockFeed = await ethers.getContractAt("MockPriceFeed", mockFeedAddr);
  const originRelay = await ethers.getContractAt("OriginFeedRelay", originRelayAddr);

  const testPrices = [1500, 1600, 1700];

  for (let i = 0; i < testPrices.length; i++) {
    const price = testPrices[i];
    console.log("─".repeat(70));
    console.log(`TEST ${i + 1}: Price Update to $${price}`);
    console.log("─".repeat(70));

    // Push price
    console.log(`1. Setting mock price to $${price}...`);
    let tx = await mockFeed.setPrice(ethers.parseUnits(price.toString(), 8));
    await tx.wait();
    console.log(`   ✅ TX: ${tx.hash}`);

    // Get price data
    const round = await mockFeed.latestRoundData();
    console.log(`   ✅ Price confirmed: $${ethers.formatUnits(round[1], 8)}`);

    // Advance time
    console.log(`2. Advancing blockchain time...`);
    await ethers.provider.send("evm_increaseTime", [65]);
    await ethers.provider.send("evm_mine", []);
    console.log(`   ✅ Time advanced 65 seconds`);

    // Relay price
    console.log(`3. Relaying to Reactive Network...`);
    tx = await originRelay.relayLatestPrice();
    await tx.wait();
    console.log(`   ✅ TX: ${tx.hash}`);
    console.log(`   📍 Event: PriceUpdateEmitted emitted for RC listening\n`);
  }

  console.log("=".repeat(70));
  console.log("✨ WORKFLOW COMPLETE");
  console.log("=".repeat(70));
  console.log("\n✅ Next: Monitor Reactive Network Lasna for:");
  console.log("   - PriceFeedReactor listening to these events");
  console.log("   - Automatic relay to DestinationFeedProxy");
  console.log("   - Prices updated on Lasna\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
