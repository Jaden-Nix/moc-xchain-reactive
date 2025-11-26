# Manual Deployment Guide - Copy & Paste Commands

Since RPC connectivity can be slow, here are direct Hardhat commands you can run in sequence.

## Step 1: Deploy to Sepolia (You have 0.2 SepETH ✅)

```bash
npx hardhat compile
npx hardhat run scripts/deploy/01_deploy_origin_sepolia.ts --network sepolia
```

**Save the addresses it prints:**
```
MockPriceFeed Address:   0x...
OriginRelay Address:     0x...
```

**Save the TX hashes:**
```
MockPriceFeed TX:   0x...
OriginRelay TX:     0x...
```

## Step 2: Deploy to Lasna

Replace the addresses from Step 1:
```bash
npx hardhat run scripts/deploy/02_deploy_reactive_lasna.ts --network lasna \
  0x[YOUR_MockPriceFeed_Address] \
  0x[YOUR_OriginRelay_Address]
```

**Save the addresses it prints:**
```
PriceFeedReactor Address:     0x...  ← YOUR REACTIVE CONTRACT
DestinationFeedProxy Address: 0x...
```

**Save the TX hashes:**
```
PriceFeedReactor TX:     0x...
DestinationProxy TX:     0x...
```

## Step 3: Run Workflow Test

```bash
npx hardhat run scripts/test/workflow-cross-chain.ts --network sepolia \
  0x[YOUR_MockPriceFeed_Address] \
  0x[YOUR_OriginRelay_Address]
```

**Save all TX hashes printed (3 prices × multiple TXs)**

## Step 4: Fill in Evidence

Copy all addresses and TX hashes into `SUBMISSION_CHECKLIST.md`

## If RPC is Slow

Wait 30 seconds between commands. If timeout, just try the same command again.

## Verify Addresses

- **Sepolia**: https://sepolia.etherscan.io/address/0x[address]
- **Lasna**: https://lasna-scan.rkt.ink/address/0x[address]

---

Run these commands and paste all output here for final submission!
