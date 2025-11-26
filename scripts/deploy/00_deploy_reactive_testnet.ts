import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYING TO REACTIVE NETWORK");
  console.log("=".repeat(70));
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Deployer: ${deployer.address}\n`);

  // Step 1: Deploy MockPriceFeed
  console.log("─".repeat(70));
  console.log("STEP 1: Deploying MockPriceFeed");
  console.log("─".repeat(70));
  const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
  const mockFeed = await MockPriceFeed.deploy("ETH/USD", 8);
  await mockFeed.waitForDeployment();
  const mockFeedAddr = await mockFeed.getAddress();
  console.log(`✅ MockPriceFeed: ${mockFeedAddr}`);
  const mockFeedTx = mockFeed.deploymentTransaction();
  console.log(`   TX: ${mockFeedTx?.hash}\n`);

  // Step 2: Deploy OriginFeedRelay
  console.log("─".repeat(70));
  console.log("STEP 2: Deploying OriginFeedRelay");
  console.log("─".repeat(70));
  const OriginFeedRelay = await ethers.getContractFactory("OriginFeedRelay");
  const originRelay = await OriginFeedRelay.deploy(mockFeedAddr, "ETH/USD Price Feed Relay");
  await originRelay.waitForDeployment();
  const originAddr = await originRelay.getAddress();
  console.log(`✅ OriginFeedRelay: ${originAddr}`);
  const originTx = originRelay.deploymentTransaction();
  console.log(`   TX: ${originTx?.hash}\n`);

  // Step 3: Deploy PriceFeedReactor
  console.log("─".repeat(70));
  console.log("STEP 3: Deploying PriceFeedReactor (Reactive Contract)");
  console.log("─".repeat(70));
  const PriceFeedReactor = await ethers.getContractFactory("PriceFeedReactor");
  const reactor = await PriceFeedReactor.deploy();
  await reactor.waitForDeployment();
  const reactorAddr = await reactor.getAddress();
  console.log(`✅ PriceFeedReactor: ${reactorAddr}`);
  const reactorTx = reactor.deploymentTransaction();
  console.log(`   TX: ${reactorTx?.hash}\n`);

  // Step 4: Deploy DestinationFeedProxy
  console.log("─".repeat(70));
  console.log("STEP 4: Deploying DestinationFeedProxy");
  console.log("─".repeat(70));
  const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
  const destination = await DestinationFeedProxy.deploy(8, "ETH/USD Mirrored Price Feed");
  await destination.waitForDeployment();
  const destAddr = await destination.getAddress();
  console.log(`✅ DestinationFeedProxy: ${destAddr}`);
  const destTx = destination.deploymentTransaction();
  console.log(`   TX: ${destTx?.hash}\n`);

  // Step 5: Configure Reactor
  console.log("─".repeat(70));
  console.log("STEP 5: Configuring Reactor");
  console.log("─".repeat(70));
  const eventSignature = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
  const chainId = network.chainId;
  
  console.log("Subscribing to OriginFeedRelay events...");
  let tx = await reactor.subscribe(chainId, originAddr, eventSignature);
  await tx.wait();
  console.log(`✅ Subscribed (TX: ${tx.hash})`);

  console.log("Authorizing Reactor as relayer...");
  tx = await destination.setRelayerAuthorization(reactorAddr, true);
  await tx.wait();
  console.log(`✅ Authorized (TX: ${tx.hash})\n`);

  // Summary
  console.log("=".repeat(70));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  console.log("\n📋 CONTRACT ADDRESSES:\n");
  console.log(`MockPriceFeed:       ${mockFeedAddr}`);
  console.log(`OriginFeedRelay:     ${originAddr}`);
  console.log(`PriceFeedReactor:    ${reactorAddr}`);
  console.log(`DestinationProxy:    ${destAddr}\n`);

  console.log("📦 DEPLOYMENT TRANSACTIONS:\n");
  console.log(`MockPriceFeed:       ${mockFeedTx?.hash}`);
  console.log(`OriginFeedRelay:     ${originTx?.hash}`);
  console.log(`PriceFeedReactor:    ${reactorTx?.hash}`);
  console.log(`DestinationProxy:    ${destTx?.hash}\n`);

  console.log("🔗 BLOCK EXPLORER:\n");
  console.log(`https://kopli.reactscan.net/address/${reactorAddr}`);
  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
