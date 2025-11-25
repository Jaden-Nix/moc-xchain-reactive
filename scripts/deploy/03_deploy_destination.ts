import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=".repeat(60));
  console.log("DEPLOYING DESTINATION FEED PROXY");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const decimals = 8;
  const description = "ETH/USD Mirrored Price Feed";

  console.log("\nDeployment Parameters:");
  console.log("- Decimals:", decimals);
  console.log("- Description:", description);

  const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
  console.log("\nDeploying DestinationFeedProxy...");
  
  const feedProxy = await DestinationFeedProxy.deploy(decimals, description);
  await feedProxy.waitForDeployment();

  const address = await feedProxy.getAddress();
  console.log("✓ DestinationFeedProxy deployed to:", address);

  const reactiveContract = process.env.REACTIVE_CONTRACT || "0x0000000000000000000000000000000000000000";
  
  if (reactiveContract !== "0x0000000000000000000000000000000000000000") {
    console.log("\nAuthorizing reactive contract as relayer...");
    console.log("- Reactive Contract:", reactiveContract);
    
    const tx = await feedProxy.setRelayerAuthorization(reactiveContract, true);
    await tx.wait();
    console.log("✓ Relayer authorized");
  } else {
    console.log("\n⚠ Warning: REACTIVE_CONTRACT not set in .env");
    console.log("You'll need to call setRelayerAuthorization() manually");
  }

  console.log("\nVerifying deployment...");
  const feedConfig = await feedProxy.feedConfig();
  console.log("- Decimals:", feedConfig.decimals);
  console.log("- Description:", feedConfig.description);
  console.log("- Version:", feedConfig.version.toString());
  console.log("- Paused:", feedConfig.paused);

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUCCESSFUL");
  console.log("=".repeat(60));
  console.log("\nSave this address to your .env file:");
  console.log(`DESTINATION_FEED_PROXY=${address}`);
  console.log("\nContract is now ready to receive price updates!");
  console.log("\nNext steps:");
  console.log("1. Verify contract on Block Explorer");
  console.log("2. Test price feed integration");
  console.log("3. Monitor for incoming updates");
  console.log("=".repeat(60));

  return {
    destinationFeedProxy: address,
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
