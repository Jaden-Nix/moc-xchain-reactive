import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting deployment test...");
  console.log("Current directory:", process.cwd());
  
  try {
    const [signer] = await ethers.getSigners();
    console.log("✅ Signer obtained:", signer.address);
    
    const network = await ethers.provider.getNetwork();
    console.log("✅ Network:", network.name, "(Chain ID:", network.chainId + ")");
    
    const balance = await ethers.provider.getBalance(signer.address);
    console.log("✅ Balance:", ethers.formatEther(balance), "ETH");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
