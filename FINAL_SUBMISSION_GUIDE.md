# Final Submission Guide - Cross-Chain Price Relay

**Reactive Network Hackathon 2025**

---

## Live Demo

**Dashboard:** [https://moc-xchain.replit.app](https://moc-xchain.replit.app)

Test the complete cross-chain flow directly in your browser!

---

## Deployed Contracts

### Sepolia (Origin Chain) - Chain ID: 11155111

| Contract | Address | Etherscan |
|----------|---------|-----------|
| MockPriceFeed | `0xE293955c98D37044400E71c445062d7cd967250c` | [View](https://sepolia.etherscan.io/address/0xE293955c98D37044400E71c445062d7cd967250c) |
| OriginFeedRelay | `0x46ad513300d508FB234fefD3ec1aB4162C547A57` | [View](https://sepolia.etherscan.io/address/0x46ad513300d508FB234fefD3ec1aB4162C547A57) |

### Lasna (Reactive Network) - Chain ID: 5318007

| Contract | Address |
|----------|---------|
| PriceFeedReactor | `0xE293955c98D37044400E71c445062d7cd967250c` |
| DestinationFeedProxy | `0x46ad513300d508FB234fefD3ec1aB4162C547A57` |

---

## Transaction Proofs

### Sepolia Deployment

| Contract | TX Hash | Explorer |
|----------|---------|----------|
| MockPriceFeed | `0x5ec64c041ad910807e79e4a9dfce42b486d521fe14126d42a7879e5ab2fc6033` | [Etherscan](https://sepolia.etherscan.io/tx/0x5ec64c041ad910807e79e4a9dfce42b486d521fe14126d42a7879e5ab2fc6033) |
| OriginFeedRelay | `0xdd9d18962dc764ce3363799b129ca9a0de3f259370ccecfcb0e47f1fc3e61b83` | [Etherscan](https://sepolia.etherscan.io/tx/0xdd9d18962dc764ce3363799b129ca9a0de3f259370ccecfcb0e47f1fc3e61b83) |

### Lasna Deployment & Configuration

| Transaction | TX Hash |
|-------------|---------|
| Deploy PriceFeedReactor | `0x76349db94bbfc38222822675746d864c40bddf4b17d986e8990f2717da5e09ca` |
| Deploy DestinationProxy | `0x65f19461edd78d24b3ce3c454be02f5253667dda19394af511828c98e5233d25` |
| Subscribe to Sepolia Events | `0xc514b344248897e5355a221e6e56272db271efc9c8d246a738dfd88a0b48cf21` |
| Authorize Reactor as Relayer | `0xfc87a4a1ba8094a90fbc94b6b95e77afc05ec32b79893e4b97b5e0ec2b5b286d` |

**Lasna Explorer:** https://lasna-scan.rkt.ink/

---

## Requirements Checklist - 100% Complete

### 1. Origin Chain Reads AggregatorV3Interface
**File:** `contracts/origin/OriginFeedRelay.sol` (lines 95-101)

```solidity
(
    uint80 roundId,
    int256 answer,
    uint256 startedAt,
    uint256 updatedAt,
    uint80 answeredInRound
) = priceFeed.latestRoundData();
```

All 5 fields captured correctly.

### 2. Cross-Chain Message with Required Fields
**File:** `contracts/origin/OriginFeedRelay.sol` (lines 115-149)

Message includes 7 fields:
- roundId
- answer (int256)
- updatedAt (timestamp)
- decimals (uint8)
- description (string)
- chainId (origin chain)
- version

### 3. Destination Stores All Fields + AggregatorV3Interface
**File:** `contracts/destination/DestinationFeedProxy.sol`

- Stores all 7 fields in `RoundData` + `FeedConfig` structs
- Implements complete `AggregatorV3Interface`:
  - `latestRoundData()` - lines 164-192
  - `getRoundData(uint80)` - lines 197-219
  - `decimals()` - line 224
  - `description()` - line 231
  - `version()` - line 238

---

## Security Features (8/8 Implemented)

| Feature | Implementation | Status |
|---------|----------------|--------|
| Zero-price validation | Rejects `answer <= 0` | Done |
| Staleness detection | 1-hour threshold | Done |
| Replay protection | Round ID sequence check | Done |
| Anomaly detection | >10% price jump alerts | Done |
| Access control | Authorized relayers only | Done |
| Reentrancy guard | OpenZeppelin nonReentrant | Done |
| Pause functionality | Owner can pause | Done |
| Rate limiting | 60s minimum interval | Done |

---

## Architecture

```
SEPOLIA (Origin - 11155111)
├── MockPriceFeed (0xE293...250c)
│   └── AggregatorV3Interface (ETH/USD)
│
└── OriginFeedRelay (0x46ad...A57)
    ├── Reads price from MockPriceFeed
    ├── Validates: zero-price, staleness, rate limit
    └── Emits PriceUpdateEmitted event
        │
        ▼
REACTIVE NETWORK (Lasna - 5318007)
├── PriceFeedReactor (0xE293...250c)
│   ├── Subscribes to Sepolia events
│   ├── Validates: confidence, replay protection
│   └── Calls DestinationFeedProxy.updatePrice()
│
└── DestinationFeedProxy (0x46ad...A57)
    ├── Stores all 7 fields
    ├── AggregatorV3Interface compatible
    └── Ready for downstream DApps
```

---

## How to Test

### Using the Dashboard (Recommended)
1. Go to [https://moc-xchain.replit.app](https://moc-xchain.replit.app)
2. Connect MetaMask wallet
3. Click "Read Latest Price" (no wallet needed)
4. Click "Update Price to $2500" (needs Sepolia ETH)
5. Click "Relay Price" (emits cross-chain event)
6. Click "Read Destination Price" (verify on Lasna)

### Local Testing
```bash
npm install
npm test
npx hardhat run scripts/test/fresh-deploy-and-demo.ts --network hardhat
```

---

## Why Reactive Contracts?

This system is impossible without Reactive Contracts because:

| Feature | Without RC | With RC |
|---------|-----------|---------|
| Event detection | Centralized polling | Automatic subscription |
| Cross-chain calls | Manual bridge | Built-in execution |
| Replay protection | Off-chain database | On-chain deduplication |
| Trust model | Trust the operator | Trustless, code-only |

---

## Submission Summary

| Item | Status |
|------|--------|
| Live Dashboard | [moc-xchain.replit.app](https://moc-xchain.replit.app) |
| Sepolia Contracts | Deployed + Etherscan verified |
| Lasna Contracts | Deployed + Configured |
| Requirements 1-3 | 100% Complete |
| Security Features | 8/8 Implemented |
| Documentation | Complete |
| Tests | Passing |

---

## Deployment Wallet

```
0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273
```

---

**Status: READY FOR HACKATHON SUBMISSION**

Reactive Network Hackathon 2025
