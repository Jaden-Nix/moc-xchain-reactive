import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=".repeat(60));
  console.log("DEPLOYING ORIGIN FEED RELAY");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const chainlinkFeedAddress = process.env.CHAINLINK_ETH_USD_SEPOLIA || "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  const feedDescription = "ETH/USD Price Feed Relay";

  console.log("\nDeployment Parameters:");
  console.log("- Chainlink Feed:", chainlinkFeedAddress);
  console.log("- Description:", feedDescription);

  const OriginFeedRelay = await ethers.getContractFactory("OriginFeedRelay");
  console.log("\nDeploying OriginFeedRelay...");
  
  const originRelay = await OriginFeedRelay.deploy(chainlinkFeedAddress, feedDescription);
  await originRelay.waitForDeployment();

  const address = await originRelay.getAddress();
  console.log("✓ OriginFeedRelay deployed to:", address);

  console.log("\nVerifying deployment...");
  const metadata = await originRelay.getFeedMetadata();
  console.log("- Description:", metadata.description);
  console.log("- Decimals:", metadata.decimals);
  console.log("- Version:", metadata.version.toString());

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUCCESSFUL");
  console.log("=".repeat(60));
  console.log("\nSave this address to your .env file:");
  console.log(`ORIGIN_FEED_RELAY=${address}`);
  console.log("\nNext steps:");
  console.log("1. Verify contract on Etherscan");
  console.log("2. Deploy Reactive Contract");
  console.log("3. Test relayLatestPrice() function");
  console.log("=".repeat(60));

  return {
    originFeedRelay: address,
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
