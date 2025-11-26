#!/usr/bin/env node

/**
 * Automated Reactive Network Deployment
 * This script handles everything needed to deploy to Reactive Kopli testnet
 */

const ethers = require("ethers");
require("dotenv").config();

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("AUTOMATED REACTIVE NETWORK DEPLOYMENT");
  console.log("=".repeat(70) + "\n");

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY not found in environment");
    console.error("   Make sure your secret is set: npx hardhat run this --network kopli\n");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey);
  console.log(`✅ Wallet loaded: ${wallet.address}\n`);

  // Connect to Kopli
  const kopliRpc = "https://kopli-rpc.rkt.ink";
  const provider = new ethers.JsonRpcProvider(kopliRpc);

  try {
    const network = await provider.getNetwork();
    console.log(`✅ Connected to Kopli testnet`);
    console.log(`   Chain ID: ${network.chainId}`);
    console.log(`   RPC: ${kopliRpc}\n`);
  } catch (error) {
    console.error("❌ Failed to connect to Kopli RPC");
    console.error("   Error: " + error.message);
    console.error("\nTroubleshooting:");
    console.error("   - Check your internet connection");
    console.error("   - Kopli RPC might be temporarily down");
    console.error("   - Try again in a few moments\n");
    process.exit(1);
  }

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Current balance: ${ethers.formatEther(balance)} REACT\n`);

  if (balance === 0n) {
    console.log("⚠️  No tokens on Kopli yet.\n");
    console.log("To get REACT tokens, you have two options:\n");

    console.log("OPTION 1 - Automated (If you have Sepolia SepETH):");
    console.log("  1. Get SepETH: https://www.infura.io/faucet/sepolia");
    console.log("  2. Run: npm run faucet:reactive\n");

    console.log("OPTION 2 - Manual:");
    console.log("  cast send 0x9b9BB25f1A81078C544C829c5EB7822d747Cf434 \\");
    console.log("    --rpc-url https://rpc.sepolia.org \\");
    console.log("    --private-key $PRIVATE_KEY \\");
    console.log('    "request(address)" ' + wallet.address + " \\");
    console.log("    --value 0.1ether\n");

    console.log("After getting tokens, run:");
    console.log("  npx hardhat run scripts/deploy/00_deploy_reactive_testnet.ts --network kopli\n");
    process.exit(0);
  }

  console.log("✅ You have sufficient tokens to deploy!\n");
  console.log("Next steps:\n");
  console.log("1. Deploy contracts:");
  console.log("   npx hardhat run scripts/deploy/00_deploy_reactive_testnet.ts --network kopli\n");
  console.log("2. Save the contract addresses from the output\n");
  console.log("3. Run workflow tests:");
  console.log("   npx hardhat run scripts/test/multi-price-demo.ts --network kopli\n");
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
