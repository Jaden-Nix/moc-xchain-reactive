import { ethers } from "hardhat";

const NEW_ORIGIN_RELAY = '0xD200bD254a182aa0aa77d71C504189fb92481315';
const SEPOLIA_CHAIN_ID = 11155111;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYING LASNA CONTRACTS (OPTIMIZED)");
  console.log("=".repeat(70));
  console.log(`Network: Lasna (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} LASNA ETH\n`);

  const feeData = await ethers.provider.getFeeData();
  console.log(`Gas Price: ${ethers.formatUnits(feeData.gasPrice || 0n, 'gwei')} gwei\n`);

  console.log("─".repeat(70));
  console.log("STEP 1: Deploy PriceFeedReactor");
  console.log("─".repeat(70));
  
  const PriceFeedReactor = await ethers.getContractFactory("PriceFeedReactor");
  const reactor = await PriceFeedReactor.deploy({
    gasLimit: 2000000,
  });
  await reactor.waitForDeployment();
  const reactorAddr = await reactor.getAddress();
  const reactorTx = reactor.deploymentTransaction();
  console.log(`✅ PriceFeedReactor: ${reactorAddr}`);
  console.log(`   TX: ${reactorTx?.hash}\n`);

  console.log("─".repeat(70));
  console.log("STEP 2: Deploy DestinationFeedProxy");
  console.log("─".repeat(70));
  
  const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
  const destination = await DestinationFeedProxy.deploy(8, "ETH/USD Real Chainlink Mirror", {
    gasLimit: 2000000,
  });
  await destination.waitForDeployment();
  const destAddr = await destination.getAddress();
  const destTx = destination.deploymentTransaction();
  console.log(`✅ DestinationFeedProxy: ${destAddr}`);
  console.log(`   TX: ${destTx?.hash}\n`);

  console.log("─".repeat(70));
  console.log("STEP 3: Configure Reactor");
  console.log("─".repeat(70));
  
  const eventSignature = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
  
  console.log("Subscribing to Sepolia OriginFeedRelay (real Chainlink)...");
  let tx = await reactor.subscribe(SEPOLIA_CHAIN_ID, NEW_ORIGIN_RELAY, eventSignature, {
    gasLimit: 200000,
  });
  await tx.wait();
  console.log(`✅ Subscribed (TX: ${tx.hash})`);

  console.log("Setting destination...");
  tx = await reactor.setDestination(Number(network.chainId), destAddr, {
    gasLimit: 100000,
  });
  await tx.wait();
  console.log(`✅ Destination set (TX: ${tx.hash})`);

  console.log("Authorizing reactor as relayer...");
  tx = await destination.setRelayerAuthorization(reactorAddr, true, {
    gasLimit: 100000,
  });
  await tx.wait();
  console.log(`✅ Authorized (TX: ${tx.hash})\n`);

  console.log("=".repeat(70));
  console.log("DEPLOYMENT COMPLETE - REAL CHAINLINK INTEGRATION");
  console.log("=".repeat(70));
  console.log(`
📋 NEW LASNA CONTRACTS:
   PriceFeedReactor:     ${reactorAddr}
   DestinationFeedProxy: ${destAddr}

📊 CONNECTED TO:
   Origin Relay (Sepolia): ${NEW_ORIGIN_RELAY}
   Real Chainlink ETH/USD: 0x694AA1769357215DE4FAC081bf1f309aDC325306

📦 TRANSACTIONS:
   Reactor Deploy: ${reactorTx?.hash}
   Destination Deploy: ${destTx?.hash}

🔗 EXPLORERS:
   https://lasna-scan.rkt.ink/address/${reactorAddr}
   https://lasna-scan.rkt.ink/address/${destAddr}
`);
  console.log("=".repeat(70) + "\n");

  console.log("Saving deployment info...");
  const fs = await import('fs');
  const deploymentInfo = {
    network: "lasna",
    chainId: 5318007,
    deployer: deployer.address,
    originRelay: NEW_ORIGIN_RELAY,
    reactorAddress: reactorAddr,
    destinationAddress: destAddr,
    reactorTxHash: reactorTx?.hash,
    destinationTxHash: destTx?.hash,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync('deployment-lasna-real.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Saved to deployment-lasna-real.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
