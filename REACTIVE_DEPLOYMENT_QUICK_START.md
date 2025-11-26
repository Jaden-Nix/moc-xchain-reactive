# Reactive Network Deployment - Quick Start

## Prerequisites

### 1. Get Testnet Tokens

**Reactive Kopli Testnet Info:**
- RPC: `https://kopli-rpc.rkt.ink`
- Chain ID: `5318008`
- Explorer: `https://kopli.reactscan.net`

**Option A: Use Sepolia Faucet (Easiest)**
1. Get some testnet ETH from Sepolia faucet: https://www.infura.io/faucet/sepolia
2. Go to Reactive faucet: Send SepETH to `0x9b9BB25f1A81078C544C829c5EB7822d747Cf434`
3. You'll receive REACT tokens on Kopli testnet
4. Add Kopli to MetaMask from https://chainlist.org/chain/5318008

**Option B: Direct Cast CLI**
```bash
cast send 0x9b9BB25f1A81078C544C829c5EB7822d747Cf434 \
  --rpc-url https://rpc.sepolia.org \
  --private-key $YOUR_SEPOLIA_PRIVATE_KEY \
  "request(address)" $YOUR_KOPLI_ADDRESS \
  --value 0.1ether
```

### 2. Set Environment Variables

Create or update `.env`:
```bash
PRIVATE_KEY=your_private_key_here
REACTIVE_RPC_URL=https://kopli-rpc.rkt.ink
```

**Never commit .env to git!**

## Deployment Steps

### Step 1: Verify Setup
```bash
# Check balance on Kopli
npx hardhat account --network kopli

# You should see: Balance: X REACT
```

### Step 2: Deploy Contracts
```bash
# Run deployment script
npx hardhat run scripts/deploy/00_deploy_reactive_testnet.ts --network kopli
```

**Output will show:**
```
MockPriceFeed:       0x...
OriginFeedRelay:     0x...
PriceFeedReactor:    0x...  ← THIS IS YOUR REACTIVE CONTRACT
DestinationProxy:    0x...
```

**Save these addresses!** You'll need them for the submission.

### Step 3: Record Deployment TXs

From the output, save all 4 deployment transaction hashes:
- MockPriceFeed TX: 0x...
- OriginFeedRelay TX: 0x...
- PriceFeedReactor TX: 0x...  ← Reactive Contract
- DestinationProxy TX: 0x...

Check them on explorer: https://kopli.reactscan.net/tx/[TX_HASH]

## Next: Run Workflow Tests

Once deployed, you'll update these scripts to use the deployed addresses:

```bash
# Edit scripts to use deployed addresses
npx hardhat run scripts/test/multi-price-demo.ts --network kopli
```

This will generate transaction hashes for:
1. Price push (Origin chain)
2. Relay (Reactive contract)
3. Destination update

## Troubleshooting

**"Cannot find module" error**
```bash
npm install
npx hardhat compile
```

**"Account validation failed" error**
- Check PRIVATE_KEY is set correctly in .env
- Ensure you have REACT tokens on Kopli (check balance)

**"RPC request failed" error**
- Kopli RPC might be temporarily down
- Use fallback: https://rpc.kopli.reactivenetwork.io
- Try again in a few seconds

**"Gas estimation failed" error**
- Try with explicit gas limit: `--gas 5000000`
- Or increase gas price multiplier

## What Happens Next

1. ✅ Deploy to Kopli → Get contract addresses
2. ⬜ Run price updates → Get transaction hashes
3. ⬜ Record evidence → Complete submission

See **SUBMISSION_CHECKLIST.md** for the full evidence template.
