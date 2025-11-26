# Reactive Contracts Network Deployment Guide

## Architecture Overview

Your cross-chain price relay uses Reactive Contracts to automate price synchronization:

```
┌─────────────────────────────────────────────────────────────────┐
│ ORIGIN CHAIN (Any EVM Chain)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────────┐         │
│  │ MockPriceFeed    │────────▶│ OriginFeedRelay      │         │
│  │ (Chainlink-like) │  Price  │ (Monitors & Emits)   │         │
│  │                  │  Updates│                      │         │
│  └──────────────────┘         └──────┬───────────────┘         │
│                                      │ Emits Events             │
│                                      │ Price Update Events      │
└──────────────────────────────────────┼──────────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │  REACTIVE NETWORK (Your RC)         │
                    │                                     │
                    │  ┌────────────────────────────────┐ │
                    │  │ PriceFeedReactor (RC Contract) │ │
                    │  │ - Listens to origin events     │ │
                    │  │ - Validates price data         │ │
                    │  │ - Initiates relay transactions │ │
                    │  └────────────┬───────────────────┘ │
                    │               │                      │
                    └───────────────┼──────────────────────┘
                                    │
                    ┌───────────────▼──────────────────┐
                    │ DESTINATION CHAIN                │
                    │                                  │
                    │ ┌──────────────────────────────┐ │
                    │ │ DestinationFeedProxy         │ │
                    │ │ - Receives relayed prices    │ │
                    │ │ - Stores price history       │ │
                    │ │ - Validates staleness        │ │
                    │ │ - Prevents corruption        │ │
                    │ └──────────────────────────────┘ │
                    │                                  │
                    └──────────────────────────────────┘
```

## Why Reactive Contracts Are Essential

### Problem Without RC:
- **Manual Polling**: Server continuously asks origin chain "any new prices?"
- **Latency**: Prices delayed by polling interval (5s-1min)
- **Race Conditions**: Multiple relayers may trigger duplicate updates
- **Gas Waste**: Constant queries even when nothing changed
- **Centralization**: Requires trusted external service
- **Complexity**: Must handle chain failures, retries, sequencing

### Solution With RC:
- **Event-Driven**: Automatically triggered only when price actually changes
- **Instant**: Reaction in next block after event
- **Atomic**: Single transaction ensures consistency
- **Efficient**: Only pays for actual updates
- **Decentralized**: Runs on Reactive Network validators
- **Simple**: Just define rules, RC executes them

### Why Can't Standard Contracts Do This:
Standard contracts can't:
- ❌ Listen to events on other chains
- ❌ Automatically trigger transactions
- ❌ Cross-chain atomicity
- ❌ Event pattern matching
- ❌ Temporal coordination

Reactive Contracts can:
- ✅ Monitor origin chain events in real-time
- ✅ Execute destination transactions automatically
- ✅ Guarantee cross-chain synchronization
- ✅ Complex pattern matching
- ✅ Temporal guarantees

## Deployment Workflow

### Phase 1: Local Testing ✅ (COMPLETED)
```bash
# Already done!
npx hardhat node
npx hardhat run scripts/test/multi-price-demo.ts --network localhost
```

**Result**: Verified all components work together locally

### Phase 2: Reactive Testnet Deployment (NEXT)

**Step 2a: Setup Testnet Access**
```bash
# Get testnet configuration
# RPC: https://testnet.reactivenetwork.io
# Chain ID: [Your RC Testnet ID]
# Faucet: [Request testnet tokens]

# Update hardhat.config.ts to add network:
# reactive: {
#   url: "https://testnet.reactivenetwork.io",
#   chainId: [FROM DOCS],
#   accounts: [YOUR_PRIVATE_KEY]
# }
```

**Step 2b: Deploy Contracts**
```bash
# Create deploy script for testnet
npx hardhat run scripts/deploy/00_deploy_reactive_testnet.ts --network reactive

# This will output:
# - Reactive Contract Address: 0x...
# - Origin Contract Address: 0x...
# - Destination Contract Address: 0x...
# - All deployment transaction hashes
```

**Step 2c: Verify Deployment**
```bash
# Check contracts on block explorer
# https://testnet.reactivenetwork.io/address/[RC_ADDRESS]

# Verify each contract is deployed and initialized
```

### Phase 3: Execute Workflow (Generate Evidence)

**Step 3a: Push Price on Origin**
```bash
# Call OriginFeedRelay.relayLatestPrice()
TX_HASH_1=$(npx hardhat run scripts/origin/push-price.ts)
# Record: TX_HASH_1
```

**Step 3b: Observe Reactive Execution**
```bash
# Wait for RC to pick up event and execute destination transaction
# Monitor logs: "Relay transaction initiated..."
TX_HASH_2=$(REACTIVE_RELAY_TX)
# Record: TX_HASH_2
```

**Step 3c: Verify Destination Update**
```bash
# Check DestinationFeedProxy.latestRoundData()
# Price should match origin
TX_HASH_3=$(DESTINATION_UPDATE_TX)
# Record: TX_HASH_3
```

### Phase 4: Document Results

**Evidence Checklist:**
```
For each price update ($1500, $1600, $1700):
[ ] Origin transaction hash
[ ] Reactive relay transaction hash
[ ] Destination update transaction hash
[ ] Block explorer verification
[ ] Timestamp of each transaction
[ ] Final price on destination = origin price
```

## Actual Transaction Flow (After Deployment)

### Example: Price Update from $2000 to $2500

**Transaction 1: Origin (30 gas)**
```
Function: setPrice(2500)
TX: 0x[HASH]
Block: [N]
From: [YOUR_ADDRESS]
To: MockPriceFeed
Status: ✅ Success
```

**Transaction 2: Relay to RC (200 gas)**
```
Function: relayLatestPrice()
TX: 0x[HASH]
Block: [N+1]
From: [YOUR_ADDRESS]
To: OriginFeedRelay
Status: ✅ Success
Emits: PriceUpdateEmitted(roundId=X, price=2500)
```

**Transaction 3: RC Processing (Automatic)**
```
Function: [RC Internal processing]
TX: 0x[HASH]
Block: [N+2] (on Reactive Network)
From: Reactive Network Validator
Status: ✅ Success
Event: Relay initiated to destination chain
```

**Transaction 4: Destination Update (250 gas)**
```
Function: updatePrice(X, 2500, ...)
TX: 0x[HASH]
Block: [M]
From: Reactor Contract
To: DestinationFeedProxy
Status: ✅ Success
Result: Destination now has price=2500
```

**Verification:**
```
OriginFeed.latestRoundData()     → price=2500
DestinationProxy.latestRoundData() → price=2500
✅ MATCH - Relay successful
```

## Troubleshooting Deployment

| Issue | Solution |
|-------|----------|
| No testnet tokens | Use faucet at [REACTIVE_FAUCET_URL] |
| Contract validation fails | Verify contract sizes, no unused code |
| RC not picking up events | Check event signature matches exactly |
| Destination not updating | Verify relayer authorization set |
| Gas too high | Optimize contract size, check for loops |

## Files You'll Need to Upload to Reactive

1. `contracts/mocks/MockPriceFeed.sol` - Origin price feed
2. `contracts/origin/OriginFeedRelay.sol` - Origin relay
3. `contracts/reactive/PriceFeedReactor.sol` - RC contract
4. `contracts/destination/DestinationFeedProxy.sol` - Destination
5. `scripts/deploy/00_deploy_reactive_testnet.ts` - Deployment script
6. `SHELL_TUTORIAL.md` - Usage instructions
7. `SUBMISSION_CHECKLIST.md` - This evidence document

## Estimated Gas Costs (Testnet)

| Operation | Gas | Cost (Approx) |
|-----------|-----|--------------|
| Deploy Origin | 500K | 0.01 RxN |
| Deploy RC | 800K | 0.016 RxN |
| Deploy Destination | 600K | 0.012 RxN |
| Push Price | 30K | 0.0006 RxN |
| Relay Price | 200K | 0.004 RxN |
| Update Destination | 250K | 0.005 RxN |
| **Total for 1 workflow** | **~1.3M** | **~0.026 RxN** |

## Success Criteria

Your submission is complete when:
- ✅ Contracts deploy to Reactive testnet
- ✅ All contract addresses recorded
- ✅ Minimum 3 price updates executed
- ✅ All transaction hashes documented
- ✅ Block explorer shows successful execution
- ✅ Final destination price matches origin
- ✅ Evidence document has all transaction links

## Next Steps

1. **Today**: Review this guide
2. **Tomorrow**: Setup testnet environment
3. **Day 3**: Deploy contracts, record addresses
4. **Day 4**: Execute workflow, record TX hashes
5. **Day 5**: Finalize documentation
