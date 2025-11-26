import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYING REACTIVE CONTRACT TO LASNA");
  console.log("=".repeat(70));
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Deployer: ${deployer.address}\n`);

  // Get Origin contract addresses from environment or args
  const mockFeedAddr = process.argv[2] || "0x0000000000000000000000000000000000000000";
  const originRelayAddr = process.argv[3] || "0x0000000000000000000000000000000000000000";
  const sepoliaChainId = 11155111;

  if (mockFeedAddr === "0x0000000000000000000000000000000000000000") {
    console.error("❌ ERROR: Must pass MockPriceFeed and OriginRelay addresses");
    console.error("Usage: npx hardhat run scripts/deploy/02_deploy_reactive_lasna.ts --network lasna <mockFeedAddr> <originRelayAddr>\n");
    process.exit(1);
  }

  console.log(`Origin Network: Sepolia (Chain ID: ${sepoliaChainId})`);
  console.log(`MockPriceFeed (Sepolia): ${mockFeedAddr}`);
  console.log(`OriginRelay (Sepolia):   ${originRelayAddr}\n`);

  // Deploy PriceFeedReactor
  console.log("─".repeat(70));
  console.log("DEPLOYING PriceFeedReactor (Reactive Contract)");
  console.log("─".repeat(70));
  const PriceFeedReactor = await ethers.getContractFactory("PriceFeedReactor");
  const reactor = await PriceFeedReactor.deploy();
  await reactor.waitForDeployment();
  const reactorAddr = await reactor.getAddress();
  console.log(`✅ PriceFeedReactor: ${reactorAddr}`);
  const reactorTx = reactor.deploymentTransaction();
  console.log(`   TX: ${reactorTx?.hash}\n`);

  // Deploy DestinationFeedProxy
  console.log("─".repeat(70));
  console.log("DEPLOYING DestinationFeedProxy");
  console.log("─".repeat(70));
  const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
  const destination = await DestinationFeedProxy.deploy(8, "ETH/USD Mirrored Price Feed");
  await destination.waitForDeployment();
  const destAddr = await destination.getAddress();
  console.log(`✅ DestinationFeedProxy: ${destAddr}`);
  const destTx = destination.deploymentTransaction();
  console.log(`   TX: ${destTx?.hash}\n`);

  // Configure Reactor
  console.log("─".repeat(70));
  console.log("CONFIGURING REACTOR");
  console.log("─".repeat(70));
  const eventSignature = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");

  console.log("Subscribing to Sepolia OriginRelay events...");
  let tx = await reactor.subscribe(sepoliaChainId, originRelayAddr, eventSignature);
  await tx.wait();
  console.log(`✅ Subscribed to Sepolia (TX: ${tx.hash})`);

  console.log("Authorizing Reactor as relayer for Destination...");
  tx = await destination.setRelayerAuthorization(reactorAddr, true);
  await tx.wait();
  console.log(`✅ Authorized (TX: ${tx.hash})\n`);

  // Summary
  console.log("=".repeat(70));
  console.log("REACTIVE DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  console.log("\n📋 REACTIVE NETWORK ADDRESSES:\n");
  console.log(`PriceFeedReactor (RC):     ${reactorAddr}`);
  console.log(`DestinationFeedProxy:      ${destAddr}\n`);
  console.log("📦 DEPLOYMENT TRANSACTION HASHES:\n");
  console.log(`PriceFeedReactor TX:       ${reactorTx?.hash}`);
  console.log(`DestinationProxy TX:       ${destTx?.hash}\n`);
  console.log("🔗 BLOCK EXPLORER:\n");
  console.log(`https://lasna-scan.rkt.ink/address/${reactorAddr}`);
  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
