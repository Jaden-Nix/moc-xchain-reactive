import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying LINK/USD OriginFeedRelay...");
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  const LINK_FEED = '0xc59E3633BAAC79493d908e63626716e204A45EdF';
  
  const OriginFeedRelay = await ethers.getContractFactory("OriginFeedRelay");
  const relay = await OriginFeedRelay.deploy(LINK_FEED, "LINK/USD", {
    gasLimit: 2000000,
  });
  await relay.waitForDeployment();
  
  const relayAddr = await relay.getAddress();
  console.log(`✅ LINK/USD OriginFeedRelay: ${relayAddr}`);
  
  const tx = await relay.setMinUpdateInterval(60, { gasLimit: 100000 });
  await tx.wait();
  console.log("✅ Interval set");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
