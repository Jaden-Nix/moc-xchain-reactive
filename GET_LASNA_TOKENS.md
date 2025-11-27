# 🪙 Get REACT Tokens for Lasna Deployment

## The Problem
Your wallet `0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273` has **0 REACT** on Lasna (you need gas).

## The Solution (Easy - 2 Steps!)

### Step 1: Go to Faucet
Visit: https://faucet.rnk.dev

### Step 2: Bridge SepETH → REACT
1. Paste your address: `0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273`
2. Send **0.1 SepETH** from Sepolia to: `0x9b9BB25f1A81078C544C829c5EB7822d747Cf434`
3. You get: **10 REACT** on Lasna (conversion: 100 REACT per 1 SepETH)

### Conversion Math
- You have: **0.2 SepETH** (remaining after Sepolia deployment)
- Send: **0.1 SepETH** to faucet
- Get: **10 REACT** on Lasna ✅
- That's enough for multiple deployments!

---

## How It Works

**Faucet Bridge Process:**
```
Sepolia (Your wallet)
     ↓
Send 0.1 SepETH to 0x9b9BB25f1A81078C544C829c5EB7822d747Cf434
     ↓
Bridge processes (takes ~1-2 minutes)
     ↓
Lasna (Your wallet)
Get 10 REACT tokens automatically
```

---

## After You Get Tokens

Run deployment again:
```bash
export MOCK_FEED_ADDR="0xE293955c98D37044400E71c445062d7cd967250c"
export ORIGIN_RELAY_ADDR="0x46ad513300d508FB234fefD3ec1aB4162C547A57"
npx hardhat run scripts/deploy/02_deploy_reactive_lasna.ts --network lasna
```

---

## Faucet Details

| Item | Value |
|------|-------|
| **Faucet URL** | https://faucet.rnk.dev |
| **Faucet Address** | 0x9b9BB25f1A81078C544C829c5EB7822d747Cf434 |
| **Network** | Sepolia (send from here) |
| **Destination** | Lasna (receive on this chain) |
| **Conversion** | 100 REACT per 1 SepETH |
| **Min Amount** | 0.01 SepETH |
| **Max Per Tx** | 5 SepETH |
| **Your Wallet** | 0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273 |

---

## Status Check

**Before Faucet:**
```bash
npx hardhat run -e "
const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://lasna-rpc.rnk.dev');
provider.getBalance('0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273')
  .then(b => console.log('Balance:', ethers.formatEther(b), 'REACT'))
" --network lasna
```

---

## Why This Works

Lasna is a testnet for Reactive Contracts. To deploy contracts, you need:
- Gas fees paid in REACT tokens
- These tokens come from the faucet bridge (Sepolia SepETH → Lasna REACT)
- Once you have tokens, you can deploy unlimited contracts (until tokens run out)

---

## Next Steps

1. Visit https://faucet.rnk.dev
2. Send 0.1 SepETH (takes ~1-2 minutes)
3. Come back and run the deployment again
4. Done! ✨

---

**You're 5 minutes away from complete Lasna deployment!**
