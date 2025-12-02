import { ethers } from "hardhat";

const EXISTING_REACTOR = '0xE293955c98D37044400E71c445062d7cd967250c';
const EXISTING_DESTINATION = '0x46ad513300d508FB234fefD3ec1aB4162C547A57';
const NEW_ORIGIN_RELAY = '0xD200bD254a182aa0aa77d71C504189fb92481315';
const SEPOLIA_CHAIN_ID = 11155111;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n" + "=".repeat(70));
  console.log("ADDING REAL CHAINLINK SUBSCRIPTION TO EXISTING REACTOR");
  console.log("=".repeat(70));
  console.log(`Network: Lasna (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} LASNA ETH\n`);

  const reactor = await ethers.getContractAt("PriceFeedReactor", EXISTING_REACTOR);
  const destination = await ethers.getContractAt("DestinationFeedProxy", EXISTING_DESTINATION);

  console.log("Checking reactor ownership...");
  const owner = await reactor.owner();
  console.log(`Reactor owner: ${owner}`);
  
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("❌ ERROR: You are not the owner of this reactor!");
    process.exit(1);
  }
  console.log("✅ You are the owner\n");

  const currentSubCount = await reactor.subscriptionCount();
  console.log(`Current subscriptions: ${currentSubCount.toString()}`);

  console.log("─".repeat(70));
  console.log("ADDING NEW SUBSCRIPTION FOR REAL CHAINLINK FEED");
  console.log("─".repeat(70));
  console.log(`Origin Relay (Sepolia): ${NEW_ORIGIN_RELAY}`);
  console.log(`Origin Chain ID: ${SEPOLIA_CHAIN_ID}`);

  const eventSignature = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
  console.log(`Event Signature: ${eventSignature}\n`);

  console.log("Subscribing to real Chainlink OriginFeedRelay...");
  let tx = await reactor.subscribe(SEPOLIA_CHAIN_ID, NEW_ORIGIN_RELAY, eventSignature);
  let receipt = await tx.wait();
  console.log(`✅ Subscription added (TX: ${tx.hash})`);

  const newSubCount = await reactor.subscriptionCount();
  console.log(`New subscription count: ${newSubCount.toString()}\n`);

  console.log("─".repeat(70));
  console.log("SETTING DESTINATION CONTRACT");
  console.log("─".repeat(70));
  
  console.log("Setting destination to existing DestinationFeedProxy...");
  tx = await reactor.setDestination(Number(network.chainId), EXISTING_DESTINATION);
  await tx.wait();
  console.log(`✅ Destination set (TX: ${tx.hash})\n`);

  console.log("Verifying reactor is authorized on destination...");
  const destOwner = await destination.owner();
  console.log(`Destination owner: ${destOwner}`);
  
  if (destOwner.toLowerCase() === deployer.address.toLowerCase()) {
    tx = await destination.setRelayerAuthorization(EXISTING_REACTOR, true);
    await tx.wait();
    console.log(`✅ Reactor re-authorized (TX: ${tx.hash})`);
  } else {
    console.log("⚠️  You are not the destination owner, skipping authorization");
  }

  console.log("\n" + "=".repeat(70));
  console.log("CONFIGURATION COMPLETE");
  console.log("=".repeat(70));
  console.log(`
✅ SUMMARY:
   - Reactor: ${EXISTING_REACTOR}
   - Now subscribed to REAL Chainlink OriginFeedRelay: ${NEW_ORIGIN_RELAY}
   - Destination: ${EXISTING_DESTINATION}
   - Total subscriptions: ${newSubCount.toString()}

⚡ NEXT STEPS:
   1. Update relay worker with new origin relay address
   2. Test relay with real Chainlink price data
`);
  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
