const hre = require("hardhat");

async function main() {
    const [user] = await hre.ethers.getSigners();

    // Attach to deployed contracts (replace with your addresses)
    const origin = await hre.ethers.getContractAt("OriginFeedRelay", "<ORIGIN_ADDRESS>");
    const reactor = await hre.ethers.getContractAt("PriceFeedReactor", "<REACTOR_ADDRESS>");
    const destination = await hre.ethers.getContractAt("DestinationFeedProxy", "<DESTINATION_ADDRESS>");

    // 1. Emit a new price update (simulate Chainlink)
    const newPrice = hre.ethers.utils.parseUnits("2001.32", 8);
    let tx = await origin.simulatePriceUpdate(newPrice); // make sure you add this helper in contract for demo
    await tx.wait();
    console.log("OriginFeedRelay emitted new price:", newPrice.toString());

    // 2. Process the event in Reactive Contract
    tx = await reactor.processPendingRelays();
    await tx.wait();
    console.log("Reactive contract processed relay");

    // 3. Read latest price at Destination
    const latest = await destination.latestRoundData();
    console.log("Mirrored price at destination:", latest.answer.toString());
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});