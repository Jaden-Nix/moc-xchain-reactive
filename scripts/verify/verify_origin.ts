import { run } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractAddress = process.env.ORIGIN_FEED_RELAY;
  const chainlinkFeed = process.env.CHAINLINK_ETH_USD_SEPOLIA || "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  const description = "ETH/USD Price Feed Relay";

  if (!contractAddress) {
    throw new Error("ORIGIN_FEED_RELAY not set in .env");
  }

  console.log("Verifying OriginFeedRelay at:", contractAddress);
  console.log("Constructor args:", [chainlinkFeed, description]);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [chainlinkFeed, description],
    });
    console.log("✓ Contract verified successfully");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✓ Contract already verified");
    } else {
      console.error("Verification failed:", error);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
