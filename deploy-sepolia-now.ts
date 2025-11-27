import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYING TO SEPOLIA");
  console.log("=".repeat(70));
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Chain: ${network.chainId}\n`);

  // Deploy MockPriceFeed
  console.log("Deploying MockPriceFeed...");
  const MockFeed = await ethers.getContractFactory("MockPriceFeed");
  const mockFeed = await MockFeed.deploy("ETH/USD", 8);
  await mockFeed.waitForDeployment();
  const mockAddr = await mockFeed.getAddress();
  console.log(`✅ MockPriceFeed: ${mockAddr}`);
  console.log(`   TX: ${mockFeed.deploymentTransaction()?.hash}\n`);

  // Deploy OriginRelay
  console.log("Deploying OriginFeedRelay...");
  const OriginRelay = await ethers.getContractFactory("OriginFeedRelay");
  const relay = await OriginRelay.deploy(mockAddr, "ETH/USD Feed");
  await relay.waitForDeployment();
  const relayAddr = await relay.getAddress();
  console.log(`✅ OriginRelay: ${relayAddr}`);
  console.log(`   TX: ${relay.deploymentTransaction()?.hash}\n`);

  console.log("=".repeat(70));
  console.log("SAVE THESE ADDRESSES:");
  console.log("=".repeat(70));
  console.log(`MockPriceFeed: ${mockAddr}`);
  console.log(`OriginRelay:   ${relayAddr}`);
  console.log("=".repeat(70) + "\n");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
