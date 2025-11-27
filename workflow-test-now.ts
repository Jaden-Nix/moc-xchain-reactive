import { ethers } from "hardhat";

async function main() {
  const mockAddr = "0xE293955c98D37044400E71c445062d7cd967250c";
  const relayAddr = "0x46ad513300d508FB234fefD3ec1aB4162C547A57";

  console.log("\n" + "=".repeat(70));
  console.log("RUNNING WORKFLOW TEST - 3 PRICE UPDATES");
  console.log("=".repeat(70) + "\n");

  const mockFeed = await ethers.getContractAt("MockPriceFeed", mockAddr);
  const relay = await ethers.getContractAt("OriginFeedRelay", relayAddr);

  const prices = [1500, 1600, 1700];

  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];
    console.log(`\n${"─".repeat(70)}`);
    console.log(`PRICE ${i + 1}: $${price}`);
    console.log("─".repeat(70));

    // Set price
    console.log(`Setting price to $${price}...`);
    let tx = await mockFeed.setPrice(ethers.parseUnits(price.toString(), 8));
    await tx.wait();
    console.log(`✅ TX: ${tx.hash}`);

    // Advance time
    await ethers.provider.send("evm_increaseTime", [65]);
    await ethers.provider.send("evm_mine", []);
    console.log(`✅ Time advanced`);

    // Relay
    console.log(`Relaying price...`);
    tx = await relay.relayLatestPrice();
    await tx.wait();
    console.log(`✅ TX: ${tx.hash}\n`);
  }

  console.log("=".repeat(70));
  console.log("✅ WORKFLOW COMPLETE - 3 PRICES RELAYED");
  console.log("=".repeat(70) + "\n");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
