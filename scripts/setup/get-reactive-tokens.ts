import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("REACTIVE NETWORK TESTNET - TOKEN REQUEST");
  console.log("=".repeat(70) + "\n");

  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();

  console.log(`Wallet Address: ${address}`);
  console.log(`Network: Reactive Kopli Testnet\n`);

  // Get current balance
  const balance = await ethers.provider.getBalance(address);
  console.log(`Current Balance: ${ethers.formatEther(balance)} REACT\n`);

  if (balance > ethers.parseEther("0.01")) {
    console.log("✅ You already have sufficient REACT tokens!");
    console.log(`   Balance: ${ethers.formatEther(balance)} REACT\n`);
    console.log("You can proceed with deployment:\n");
    console.log("   npx hardhat run scripts/deploy/00_deploy_reactive_testnet.ts --network kopli\n");
    return;
  }

  console.log("❌ Low balance. You need REACT tokens to deploy.\n");
  console.log("To get REACT tokens, follow these steps:\n");
  console.log("STEP 1: Get Sepolia testnet ETH");
  console.log("   Visit: https://www.infura.io/faucet/sepolia");
  console.log("   Paste this address: " + address);
  console.log("   Request 0.1 testnet ETH\n");

  console.log("STEP 2: Send to Reactive Faucet");
  console.log("   Once you have SepETH, run this command:");
  console.log("   cast send 0x9b9BB25f1A81078C544C829c5EB7822d747Cf434 \\");
  console.log("     --rpc-url https://rpc.sepolia.org \\");
  console.log("     --private-key $PRIVATE_KEY \\");
  console.log("     \"request(address)\" " + address + " \\");
  console.log("     --value 0.1ether\n");

  console.log("STEP 3: Wait 1-2 minutes");
  console.log("   The faucet will send REACT to your Kopli address\n");

  console.log("STEP 4: Deploy");
  console.log("   npx hardhat run scripts/deploy/00_deploy_reactive_testnet.ts --network kopli\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
