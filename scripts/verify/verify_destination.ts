import { run } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractAddress = process.env.DESTINATION_FEED_PROXY;
  const decimals = 8;
  const description = "ETH/USD Mirrored Price Feed";

  if (!contractAddress) {
    throw new Error("DESTINATION_FEED_PROXY not set in .env");
  }

  console.log("Verifying DestinationFeedProxy at:", contractAddress);
  console.log("Constructor args:", [decimals, description]);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [decimals, description],
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
