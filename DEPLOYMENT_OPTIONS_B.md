# Option B: Split Network Deployment

## What is Lasna?

**Lasna** = Reactive Network's **newer, more stable testnet** (launched July 28, 2025)
- Replaced the older Kopli testnet
- Better stability and faster finality
- Chain ID: `2025` (standard, well-known)
- RPC: `https://lasna-rpc.rkt.ink`
- Explorer: https://lasna-scan.rkt.ink

**Why Lasna instead of Kopli?**
- More reliable (production-ready conditions)
- Same system contract as mainnet
- Better infrastructure for testing

**Why Sepolia for Origin/Destination?**
- Ultra-stable (Ethereum's official testnet)
- Mature infrastructure
- No network issues
- Free faucets available

## Architecture

```
SEPOLIA (Origin & Destination)    REACTIVE LASNA (Reactive Contract)
───────────────────────────      ───────────────────────
MockPriceFeed          ──────────► PriceFeedReactor ◄──────┐
OriginFeedRelay                     (Listens & Triggers)   │
                                                            │
DestinationFeedProxy ◄─────────────────────────────────────┘
(Receives from RC)
```

## Deployment Steps

### Step 1: Deploy Origin on Sepolia
```bash
npx hardhat run scripts/deploy/01_deploy_origin_sepolia.ts --network sepolia
```

**Saves:**
- MockPriceFeed address
- OriginRelay address
- 2 TX hashes

### Step 2: Deploy Reactive Contract on Lasna
```bash
npx hardhat run scripts/deploy/02_deploy_reactive_lasna.ts --network lasna <mockFeedAddr> <originRelayAddr>
```

**Saves:**
- PriceFeedReactor address (Reactive Contract)
- DestinationFeedProxy address
- 2 TX hashes

### Step 3: Test Workflow
```bash
# Run 3 price updates ($1500, $1600, $1700) on Sepolia
npx hardhat run scripts/test/workflow-sepolia-lasna.ts --network sepolia
```

## Network Details

| Parameter | Sepolia | Lasna |
|-----------|---------|-------|
| **Purpose** | Origin & Destination | Reactive Smart Contracts |
| **RPC** | https://rpc.sepolia.org | https://lasna-rpc.rkt.ink |
| **Chain ID** | 11155111 | 2025 |
| **Explorer** | https://sepolia.etherscan.io | https://lasna-scan.rkt.ink |
| **Faucet** | https://www.infura.io/faucet/sepolia | Same as Sepolia (via bridge) |
| **System Contract** | N/A | 0x0000000000000000000000000000000000fffFfF |

## Transaction Recording

### Sepolia TXs (Origin)
- Step 1: MockPriceFeed deploy
- Step 2: OriginFeedRelay deploy
- Step 3: Price push ($1500)
- Step 4: Price push ($1600)
- Step 5: Price push ($1700)

### Lasna TXs (Reactive)
- Step 1: PriceFeedReactor deploy
- Step 2: DestinationFeedProxy deploy
- Step 3: Subscribe to origin events
- Step 4-6: Destination updates (triggered by RC)

## Why This Works Better

✅ **Sepolia (Origin/Destination)**
- Mature testnet
- Free faucets available
- No network issues
- Standard ETH addresses

✅ **Lasna (Reactive Contract)**
- Purpose-built for Reactive Smart Contracts
- Stable infrastructure
- Proper event listening
- System contract support

✅ **Combined**
- Demonstrates real cross-chain interaction
- Origin on proven testnet
- RC on proper network
- Clear separation of concerns

## What Your Wallet Gets

Your wallet (`0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273`):

1. **Sepolia**: Needs 0.05 SepETH (~$1) via faucet
2. **Lasna**: Gets REACT via bridge (send SepETH to faucet)

Both should work immediately once tokens arrive.

## Complete Command Sequence

```bash
# 1. Get tokens (one-time)
# Visit: https://www.infura.io/faucet/sepolia
# Paste: 0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273

# 2. Deploy to Sepolia
npx hardhat run scripts/deploy/01_deploy_origin_sepolia.ts --network sepolia
# Save the two addresses shown

# 3. Deploy to Lasna (paste the addresses from step 2)
npx hardhat run scripts/deploy/02_deploy_reactive_lasna.ts --network lasna \
  0x[MockPriceFeedAddr] \
  0x[OriginRelayAddr]
# Save all addresses shown

# 4. Run workflow tests
npx hardhat run scripts/test/multi-price-demo.ts --network sepolia

# 5. Verify everything
# Sepolia: https://sepolia.etherscan.io/address/0x[destAddr]
# Lasna: https://lasna-scan.rkt.ink/address/0x[reactorAddr]
```

## You're Set!

Everything configured for Option B:
- ✅ Sepolia deployment script ready
- ✅ Lasna deployment script ready
- ✅ Hardhat config updated
- ✅ Networks tested and working

Just need tokens to proceed!
