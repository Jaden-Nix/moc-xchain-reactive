import { ethers } from "hardhat";

const ORIGIN_RELAYS = {
  'ETH/USD': '0xee481f6Fad0209880D61a072Ee7307CDC74dCDf8',
  'BTC/USD': '0x12B74592d6077C1E52a814118169b1A7B78DC4F2',
  'LINK/USD': '0x760FBf81b2FE506dEc35dA1385E65C79A8fD12FB',
};

const SEPOLIA_CHAIN_ID = 11155111;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYING LASNA MULTI-FEED INFRASTRUCTURE");
  console.log("=".repeat(70));
  console.log(`Network: Lasna (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} LASNA ETH\n`);

  const deployedContracts: Record<string, { reactor: string; destination: string }> = {};

  for (const [feedName, originRelay] of Object.entries(ORIGIN_RELAYS)) {
    if (feedName === 'ETH/USD') {
      console.log(`\n⏭️  Skipping ETH/USD (already deployed)`);
      deployedContracts[feedName] = {
        reactor: '0x7d6a70f8303385D182ABAd16a8159B6A27FE6B25',
        destination: '0x9Fd448E930cE937d8dDCdF6e4F5bE8B9C6aF3581',
      };
      continue;
    }

    console.log("\n" + "─".repeat(70));
    console.log(`DEPLOYING LASNA CONTRACTS FOR ${feedName}`);
    console.log("─".repeat(70));
    console.log(`Origin Relay (Sepolia): ${originRelay}`);

    console.log("\n1. Deploying PriceFeedReactor...");
    const PriceFeedReactor = await ethers.getContractFactory("PriceFeedReactor");
    const reactor = await PriceFeedReactor.deploy({
      gasLimit: 2000000,
    });
    await reactor.waitForDeployment();
    const reactorAddr = await reactor.getAddress();
    console.log(`   ✅ PriceFeedReactor: ${reactorAddr}`);

    console.log("\n2. Deploying DestinationFeedProxy...");
    const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
    const destination = await DestinationFeedProxy.deploy(8, `${feedName} Chainlink Mirror`, {
      gasLimit: 2000000,
    });
    await destination.waitForDeployment();
    const destAddr = await destination.getAddress();
    console.log(`   ✅ DestinationFeedProxy: ${destAddr}`);

    console.log("\n3. Configuring reactor...");
    const eventSignature = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
    
    let tx = await reactor.subscribe(SEPOLIA_CHAIN_ID, originRelay, eventSignature, {
      gasLimit: 200000,
    });
    await tx.wait();
    console.log(`   ✅ Subscribed to origin relay`);

    tx = await reactor.setDestination(Number(network.chainId), destAddr, {
      gasLimit: 100000,
    });
    await tx.wait();
    console.log(`   ✅ Destination set`);

    tx = await destination.setRelayerAuthorization(reactorAddr, true, {
      gasLimit: 100000,
    });
    await tx.wait();
    console.log(`   ✅ Reactor authorized as relayer`);

    deployedContracts[feedName] = {
      reactor: reactorAddr,
      destination: destAddr,
    };

    console.log(`\n✅ ${feedName} COMPLETE`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("MULTI-FEED LASNA DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  
  console.log("\n📋 DEPLOYED CONTRACTS:");
  for (const [name, addrs] of Object.entries(deployedContracts)) {
    console.log(`\n   ${name}:`);
    console.log(`     Reactor:     ${addrs.reactor}`);
    console.log(`     Destination: ${addrs.destination}`);
  }

  const fs = await import('fs');
  const deploymentInfo = {
    network: "lasna",
    chainId: 5318007,
    deployer: deployer.address,
    feeds: deployedContracts,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync('deployment-lasna-multi.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ Saved to deployment-lasna-multi.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
