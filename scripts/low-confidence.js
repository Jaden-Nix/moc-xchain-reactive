const hre = require("hardhat");

async function main() {
    const origin = await hre.ethers.getContractAt("OriginFeedRelay", "<ORIGIN_ADDRESS>");
    const reactor = await hre.ethers.getContractAt("PriceFeedReactor", "<REACTOR_ADDRESS>");

    const tx = await origin.simulateLowConfidence(0, Math.floor(Date.now()/1000) - 4000);
    await tx.wait();
    console.log("Low confidence price emitted");

    await reactor.processPendingRelays();
    console.log("Reactive contract rejected low confidence update ✅");
}

main();