const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    // 1. OriginFeedRelay
    const Origin = await hre.ethers.getContractFactory("OriginFeedRelay");
    const origin = await Origin.deploy();
    await origin.deployed();
    console.log("OriginFeedRelay deployed:", origin.address);

    // 2. PriceFeedReactor
    const Reactor = await hre.ethers.getContractFactory("PriceFeedReactor");
    const reactor = await Reactor.deploy();
    await reactor.deployed();
    console.log("PriceFeedReactor deployed:", reactor.address);

    // 3. DestinationFeedProxy
    const Destination = await hre.ethers.getContractFactory("DestinationFeedProxy");
    const destination = await Destination.deploy();
    await destination.deployed();
    console.log("DestinationFeedProxy deployed:", destination.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});