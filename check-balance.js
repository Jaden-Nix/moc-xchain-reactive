const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://lasna-rpc.rnk.dev');

(async () => {
  try {
    const balance = await provider.getBalance('0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273');
    const balanceEther = ethers.formatEther(balance);
    console.log('Balance:', balanceEther, 'REACT');
    if (parseFloat(balanceEther) > 0) {
      console.log('✅ Ready to deploy!');
    } else {
      console.log('⏳ Still 0 - bridge may still be processing (wait 1-2 min)');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
