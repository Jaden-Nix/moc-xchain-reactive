const { ethers } = require('ethers');
require('dotenv').config();

const FAUCET_CONTRACT = '0x9b9BB25f1A81078C544C829c5EB7822d747Cf434';
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const AMOUNT_TO_SEND = '0.002';

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('REQUESTING LASNA TESTNET TOKENS');
  console.log('='.repeat(60));
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('PRIVATE_KEY not found in environment');
    process.exit(1);
  }
  
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC, 11155111, { staticNetwork: true });
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Sepolia ETH balance: ${ethers.formatEther(balance)} ETH\n`);
  
  const amountWei = ethers.parseEther(AMOUNT_TO_SEND);
  
  if (balance < amountWei) {
    console.error(`Insufficient Sepolia ETH. Need ${AMOUNT_TO_SEND} ETH`);
    process.exit(1);
  }
  
  console.log(`Sending ${AMOUNT_TO_SEND} SepETH to Reactive faucet...`);
  console.log(`This will give you ${parseFloat(AMOUNT_TO_SEND) * 100} LASNA tokens\n`);
  
  const tx = await wallet.sendTransaction({
    to: FAUCET_CONTRACT,
    value: amountWei,
  });
  
  console.log(`Transaction submitted: ${tx.hash}`);
  console.log('Waiting for confirmation...\n');
  
  const receipt = await tx.wait();
  console.log(`Confirmed in block ${receipt.blockNumber}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('TOKENS REQUESTED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log(`
You will receive ${parseFloat(AMOUNT_TO_SEND) * 100} LASNA tokens at:
  Address: ${wallet.address}
  
This may take a few moments to arrive on Lasna network.

After receiving tokens, run:
  npx hardhat run scripts/deploy/deploy-lasna-optimized.ts --network lasna
`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
