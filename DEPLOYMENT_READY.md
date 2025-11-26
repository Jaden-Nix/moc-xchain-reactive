# 🚀 Ready to Deploy - Reactive Network

## Your Wallet Information

```
Address:     0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273
Private Key: Stored securely in Replit secrets
Status:      ✅ Ready to deploy
```

## Current Status
- ✅ All contracts written & tested locally
- ✅ Deployment script created
- ✅ Private key secured
- ⏳ Waiting for Reactive Kopli RPC (temporarily unreachable - try again in 5-10 mins)

## Quick Start (When RPC is Back Up)

### Step 1: Get Testnet Tokens (One Time)

**Option A - Using cast CLI (Fastest):**
```bash
# First, get some Sepolia ETH: https://www.infura.io/faucet/sepolia
# Then request REACT tokens:
cast send 0x9b9BB25f1A81078C544C829c5EB7822d747Cf434 \
  --rpc-url https://rpc.sepolia.org \
  --private-key $PRIVATE_KEY \
  "request(address)" 0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273 \
  --value 0.1ether

# Wait 1-2 minutes for tokens to arrive on Kopli
```

**Option B - Manual (Web Interface):**
1. Get 0.1 SepETH from https://www.infura.io/faucet/sepolia
2. Go to https://kopli.reactscan.net
3. Add Kopli network from https://chainlist.org/chain/5318008
4. Use block explorer's contact request feature

### Step 2: Deploy All Contracts
```bash
npx hardhat run scripts/deploy/00_deploy_reactive_testnet.ts --network kopli
```

**This will output:**
```
MockPriceFeed:       0x...
OriginFeedRelay:     0x...
PriceFeedReactor:    0x... ← SAVE THIS (Reactive Contract address)
DestinationProxy:    0x...

TX Hashes:
MockPriceFeed:       0x...
OriginFeedRelay:     0x...
PriceFeedReactor:    0x... ← SAVE THIS
DestinationProxy:    0x...
```

### Step 3: Record Deployment Evidence
Copy all 8 values into `SUBMISSION_CHECKLIST.md` under "DEPLOYMENT EVIDENCE"

### Step 4: Run Workflow Tests
```bash
npx hardhat run scripts/test/multi-price-demo.ts --network kopli
```

This will record transaction hashes for:
- Price updates ($1500, $1600, $1700)
- Reactive contract relay
- Destination updates

## Network Details

| Property | Value |
|----------|-------|
| Network | Reactive Kopli Testnet |
| RPC URL | https://kopli-rpc.rkt.ink |
| Chain ID | 5318008 |
| Explorer | https://kopli.reactscan.net |
| Status | Check: https://status.reactive.network |

## Your Contracts (Ready to Deploy)

```
contracts/
├── mocks/MockPriceFeed.sol          ✅ $2000 ETH simulator
├── origin/OriginFeedRelay.sol       ✅ Event emitter
├── reactive/PriceFeedReactor.sol    ✅ Reactive Contract
└── destination/DestinationFeedProxy.sol ✅ Price receiver

scripts/deploy/
└── 00_deploy_reactive_testnet.ts    ✅ One-click deployment
```

## Troubleshooting

**"RPC connection refused"**
- Reactive RPC is temporarily down
- Try again in 5-10 minutes
- Check status: https://status.reactive.network

**"Account validation failed"**
- Ensure you have REACT tokens (not zero balance)
- Request from faucet as shown in Step 1

**"Gas estimation failed"**
- Try with explicit limit: Add `--gas 5000000` to command

## Next Steps After Deployment

1. ✅ Deploy contracts → Get addresses
2. ⬜ Run workflow demo → Get TX hashes
3. ⬜ Fill submission checklist → Get evidence ready
4. ⬜ Submit to Reactive Network

## Submission Checklist Template

See `SUBMISSION_CHECKLIST.md` - Fill in as you go:
```
Reactive Contract Address:   [FROM STEP 1]
Origin Contract Address:     [FROM STEP 1]
Destination Contract Address: [FROM STEP 1]

Deployment TXs:
  MockPriceFeed:     [FROM STEP 1]
  OriginRelay:       [FROM STEP 1]
  PriceFeedReactor:  [FROM STEP 1]
  Destination:       [FROM STEP 1]

Workflow Evidence:
  Step 1 Price ($1500): [FROM STEP 4]
  Step 2 Relay:       [FROM STEP 4]
  Step 3 Update:      [FROM STEP 4]
  [Repeat for $1600, $1700]
```

## You're All Set! 🎉

Everything is ready. Just waiting for:
1. Reactive RPC to be available ✓ (check in ~5-10 mins)
2. You to get faucet tokens (one time, ~2 mins)
3. Run deployment script (instant)
4. Record evidence (automatic)

Once RPC is back, you can complete the entire deployment in ~10 minutes total!
