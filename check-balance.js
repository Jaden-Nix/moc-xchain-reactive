const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://lasna-rpc.rnk.dev');

(async () => {
  try {
    const balance = await provider.getBalance('0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273');
    console.log('Wallet: 0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273');
    console.log('Balance:', ethers.formatEther(balance), 'REACT');
    const gasPrice = await provider.getGasPrice();
    console.log('Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
