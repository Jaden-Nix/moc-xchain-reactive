import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYING ORIGIN CONTRACTS TO SEPOLIA");
  console.log("=".repeat(70));
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Deployer: ${deployer.address}\n`);

  // Step 1: Deploy MockPriceFeed
  console.log("─".repeat(70));
  console.log("STEP 1: Deploying MockPriceFeed on Sepolia");
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
  console.log("STEP 2: Deploying OriginFeedRelay on Sepolia");
  console.log("─".repeat(70));
  const OriginFeedRelay = await ethers.getContractFactory("OriginFeedRelay");
  const originRelay = await OriginFeedRelay.deploy(mockFeedAddr, "ETH/USD Price Feed Relay");
  await originRelay.waitForDeployment();
  const originAddr = await originRelay.getAddress();
  console.log(`✅ OriginFeedRelay: ${originAddr}`);
  const originTx = originRelay.deploymentTransaction();
  console.log(`   TX: ${originTx?.hash}\n`);

  // Summary
  console.log("=".repeat(70));
  console.log("ORIGIN DEPLOYMENT COMPLETE ON SEPOLIA");
  console.log("=".repeat(70));
  console.log("\n📋 SAVE THESE ADDRESSES:\n");
  console.log(`MockPriceFeed Address:   ${mockFeedAddr}`);
  console.log(`OriginFeedRelay Address: ${originAddr}\n`);
  console.log("📦 SAVE THESE TRANSACTION HASHES:\n");
  console.log(`MockPriceFeed TX:   ${mockFeedTx?.hash}`);
  console.log(`OriginRelay TX:     ${originTx?.hash}\n`);
  console.log("🔗 VERIFY ON ETHERSCAN:\n");
  console.log(`https://sepolia.etherscan.io/address/${originAddr}`);
  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
