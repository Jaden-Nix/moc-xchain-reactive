# 🚀 Final Setup - Option B (Sepolia + Lasna)

## Your Wallet
```
Address:     0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273
Private Key: Stored in Replit secrets
```

## Networks You'll Use

| Network | Purpose | Status |
|---------|---------|--------|
| **Sepolia** | Origin & Destination contracts | ✅ Ready |
| **Lasna** | Reactive Smart Contract | ✅ Ready |

## 5-Minute Deployment

### 1️⃣ Get Sepolia Tokens
```bash
# Visit: https://www.infura.io/faucet/sepolia
# Paste your address: 0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273
# Request 0.1 SepETH (takes ~30 seconds)
```

### 2️⃣ Deploy Origin to Sepolia
```bash
npx hardhat run scripts/deploy/01_deploy_origin_sepolia.ts --network sepolia
```

**Copy these 2 addresses:**
- MockPriceFeed: `0x...`
- OriginRelay: `0x...`

### 3️⃣ Deploy Reactive to Lasna
```bash
npx hardhat run scripts/deploy/02_deploy_reactive_lasna.ts --network lasna \
  0x[PASTE_MockPriceFeedAddr] \
  0x[PASTE_OriginRelayAddr]
```

**Copy these 2 addresses:**
- PriceFeedReactor: `0x...` ← **Your Reactive Contract**
- DestinationFeedProxy: `0x...`

### 4️⃣ Run Workflow
```bash
npx hardhat run scripts/test/workflow-cross-chain.ts --network sepolia \
  0x[PASTE_MockPriceFeedAddr] \
  0x[PASTE_OriginRelayAddr]
```

This will push 3 prices ($1500, $1600, $1700) and record TX hashes.

### 5️⃣ Record Evidence
Copy all addresses and TX hashes into `SUBMISSION_CHECKLIST.md`

## What Happens

```
SEPOLIA                        LASNA (Reactive Network)
──────────────────────────     ──────────────────────────
Step 1: setPrice($1500)   ──→  RC automatically listens
  TX: 0xABC...

Step 2: relayLatestPrice()  ──→ PriceFeedReactor triggered
  TX: 0xDEF...                   Calls DestinationFeedProxy
                                 TX: 0xGHI...

Result:
Sepolia: $1500              Lasna: $1500 received ✅
```

## Your Submission Will Show

```
REACTIVE CONTRACT DEPLOYMENT
RC Address: 0x...
RPC: https://lasna-rpc.rkt.ink
Block Explorer: https://lasna-scan.rkt.ink

ORIGIN CONTRACTS (SEPOLIA)
MockPriceFeed: 0x...
OriginRelay: 0x...

DESTINATION CONTRACTS (LASNA)  
DestinationFeedProxy: 0x...

WORKFLOW EVIDENCE
Price 1 ($1500):
  - Sepolia Origin TX: 0x...
  - Lasna Destination TX: 0x...
  - Result: ✅ MATCH

Price 2 ($1600):
  - Sepolia Origin TX: 0x...
  - Lasna Destination TX: 0x...
  - Result: ✅ MATCH

Price 3 ($1700):
  - Sepolia Origin TX: 0x...
  - Lasna Destination TX: 0x...
  - Result: ✅ MATCH
```

## Files Ready

✅ `scripts/deploy/01_deploy_origin_sepolia.ts` - Deploys origin contracts  
✅ `scripts/deploy/02_deploy_reactive_lasna.ts` - Deploys RC + destination  
✅ `scripts/test/workflow-cross-chain.ts` - Tests price relay  
✅ `hardhat.config.ts` - Networks configured  
✅ `DEPLOYMENT_OPTIONS_B.md` - Detailed guide  
✅ `SUBMISSION_CHECKLIST.md` - Evidence template  

## You're All Set! ✨

Everything is ready. Just need:
1. Get 0.1 SepETH (~1 minute)
2. Run 3 deployment commands (5 minutes)
3. Submit evidence

**Total time: ~10 minutes**

See `DEPLOYMENT_OPTIONS_B.md` for detailed explanation of networks and why this setup is better.
