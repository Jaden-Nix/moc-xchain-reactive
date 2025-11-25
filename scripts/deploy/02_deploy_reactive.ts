import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=".repeat(60));
  console.log("DEPLOYING REACTIVE CONTRACT");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const PriceFeedReactor = await ethers.getContractFactory("PriceFeedReactor");
  console.log("\nDeploying PriceFeedReactor...");
  
  const reactor = await PriceFeedReactor.deploy();
  await reactor.waitForDeployment();

  const address = await reactor.getAddress();
  console.log("✓ PriceFeedReactor deployed to:", address);

  const originChainId = 11155111;
  const originContract = process.env.ORIGIN_FEED_RELAY || "0x0000000000000000000000000000000000000000";
  
  if (originContract !== "0x0000000000000000000000000000000000000000") {
    console.log("\nConfiguring subscription...");
    
    const eventSignature = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
    console.log("- Event Signature:", eventSignature);
    console.log("- Origin Chain ID:", originChainId);
    console.log("- Origin Contract:", originContract);
    
    const tx = await reactor.subscribe(originChainId, originContract, eventSignature);
    await tx.wait();
    console.log("✓ Subscription created");
    
    const subCount = await reactor.subscriptionCount();
    console.log("- Subscription ID:", (subCount - 1n).toString());
  } else {
    console.log("\n⚠ Warning: ORIGIN_FEED_RELAY not set in .env");
    console.log("You'll need to call subscribe() manually after deployment");
  }

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUCCESSFUL");
  console.log("=".repeat(60));
  console.log("\nSave this address to your .env file:");
  console.log(`REACTIVE_CONTRACT=${address}`);
  console.log("\nNext steps:");
  console.log("1. Set destination chain configuration");
  console.log("2. Deploy Destination Feed Proxy");
  console.log("3. Configure reactive network monitoring");
  console.log("=".repeat(60));

  return {
    reactiveContract: address,
    deployer: deployer.address,
    chainId: (await ethers.provider.getNetwork()).chainId,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
