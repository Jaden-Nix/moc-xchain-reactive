import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  const mockAddr = "0xE293955c98D37044400E71c445062d7cd967250c";
  const relayAddr = "0x46ad513300d508FB234fefD3ec1aB4162C547A57";
  const sepoliaChainId = 11155111;

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYING REACTIVE CONTRACT TO LASNA");
  console.log("=".repeat(70));
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Chain: ${network.chainId}`);
  console.log(`Origin (Sepolia): ${relayAddr}\n`);

  // Deploy PriceFeedReactor
  console.log("Deploying PriceFeedReactor...");
  const Reactor = await ethers.getContractFactory("PriceFeedReactor");
  const reactor = await Reactor.deploy();
  await reactor.waitForDeployment();
  const reactorAddr = await reactor.getAddress();
  console.log(`✅ PriceFeedReactor: ${reactorAddr}`);
  console.log(`   TX: ${reactor.deploymentTransaction()?.hash}\n`);

  // Deploy DestinationFeedProxy
  console.log("Deploying DestinationFeedProxy...");
  const Destination = await ethers.getContractFactory("DestinationFeedProxy");
  const dest = await Destination.deploy(8, "ETH/USD Mirrored");
  await dest.waitForDeployment();
  const destAddr = await dest.getAddress();
  console.log(`✅ DestinationFeedProxy: ${destAddr}`);
  console.log(`   TX: ${dest.deploymentTransaction()?.hash}\n`);

  // Subscribe
  console.log("Subscribing to Sepolia events...");
  const eventSig = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
  let tx = await reactor.subscribe(sepoliaChainId, relayAddr, eventSig);
  await tx.wait();
  console.log(`✅ Subscribed\n`);

  // Authorize
  console.log("Authorizing reactor...");
  tx = await dest.setRelayerAuthorization(reactorAddr, true);
  await tx.wait();
  console.log(`✅ Authorized\n`);

  console.log("=".repeat(70));
  console.log("REACTIVE NETWORK DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  console.log(`PriceFeedReactor:     ${reactorAddr}`);
  console.log(`DestinationFeedProxy: ${destAddr}`);
  console.log("=".repeat(70) + "\n");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
