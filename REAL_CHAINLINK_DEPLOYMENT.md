# Real Chainlink Integration Deployment

**Status: PRODUCTION READY** 🚀

This deployment mirrors the **official Chainlink ETH/USD Price Feed** from Sepolia to Lasna (Reactive Network).

---

## Deployed Contracts

### Sepolia (Origin Chain) - Chain ID: 11155111

| Contract | Address | Description |
|----------|---------|-------------|
| **OriginFeedRelay** | `0xee481f6Fad0209880D61a072Ee7307CDC74dCDf8` | Reads from real Chainlink and emits relay events |
| **Chainlink ETH/USD** | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | Official Chainlink Price Feed |

### Lasna (Reactive Network) - Chain ID: 5318007

| Contract | Address | Description |
|----------|---------|-------------|
| **PriceFeedReactor** | `0x7d6a70f8303385D182ABAd16a8159B6A27FE6B25` | Listens to Sepolia events, triggers destination updates |
| **DestinationFeedProxy** | `0x9Fd448E930cE937d8dDCdF6e4F5bE8B9C6aF3581` | Stores mirrored prices, AggregatorV3Interface compatible |

---

## Architecture

```
SEPOLIA (Origin Chain)
│
├─ Chainlink ETH/USD Feed (0x694AA1769357215DE4FAC081bf1f309aDC325306)
│  └─ Official Chainlink Oracle - LIVE PRICES
│
└─ OriginFeedRelay (0xD200bD254a182aa0aa77d71C504189fb92481315)
   ├─ Reads from official Chainlink feed
   ├─ Validates: zero-price, staleness (>1 hour), rate limit (60s)
   ├─ Emits PriceUpdateEmitted event with:
   │  - roundId, answer, updatedAt, decimals, description, messageHash, confidence
   └─ Event triggers Reactive Network...
      │
      └─→ LASNA (Reactive Network)
         │
         ├─ PriceFeedReactor (0x7d6a70f8303385D182ABAd16a8159B6A27FE6B25)
         │  ├─ Subscribes to Sepolia OriginFeedRelay events
         │  ├─ Validates: confidence score, replay protection
         │  └─ Calls DestinationFeedProxy.updatePrice()
         │
         └─ DestinationFeedProxy (0x9Fd448E930cE937d8dDCdF6e4F5bE8B9C6aF3581)
            ├─ Stores all 7 fields from Chainlink
            ├─ AggregatorV3Interface compatible
            └─ Can be used by any downstream DApp on Lasna
```

---

## Transaction Hashes

### Sepolia Deployment
| Action | TX Hash |
|--------|---------|
| OriginFeedRelay Deploy | `0x1db249a29c89f0be673de688c4fc90a1038fe177f968929cb8fef0276c9784bf` |
| Set Update Interval | `0x7e2570a1d780d4cad2ba18d6d7e374073d374ac3c8f1cf824f6259612a05513c` |

### Lasna Deployment
| Action | TX Hash |
|--------|---------|
| PriceFeedReactor Deploy | `0xe91ddd86a4903b6392ed58be463b68982bab6afe022720cb6816515217949933` |
| DestinationFeedProxy Deploy | `0x852aaffd1ecd5b5ed33d5bb6c9a989709cdab2c76cf81e72687c4073795f6c9e` |
| Subscribe to Sepolia | `0xa32c16089549d54758f5054acec91b1052ffd2cc72dcd09c1ecfc463eecbfa5d` |
| Set Destination | `0x297381f30a04555bcc6a9132404ca836b90403663dc2a5e6358047af12b95724` |
| Authorize Reactor | `0xc0842153ee05fa146b1e2c71de572531b694b37b112340489ff747f979eba97a` |

---

## Hackathon Requirements Verification

### Requirement 1: Read AggregatorV3Interface ✅
- **Implementation**: `OriginFeedRelay.sol` reads from real Chainlink ETH/USD
- **Data captured**: roundId, answer, startedAt, updatedAt, answeredInRound
- **Source**: Official Chainlink feed `0x694AA1769357215DE4FAC081bf1f309aDC325306`

### Requirement 2: Cross-Chain Messages ✅
- **Implementation**: PriceUpdateEmitted event with signed message
- **Contains**: feed identifier, decimals, description, roundId, answer, updatedAt, domain separator
- **Trigger**: Automatic via Reactive Network subscription

### Requirement 3: Destination Storage ✅
- **Implementation**: `DestinationFeedProxy.sol` on Lasna
- **Storage**: All 7 Chainlink fields stored atomically
- **Interface**: Full AggregatorV3Interface for downstream DApps

---

## Automated Relay Worker

The project includes a 24/7 automated relay worker that:
- Runs every 70 seconds
- Reads real ETH/USD price from Chainlink
- Calls `relayLatestPrice()` on OriginFeedRelay
- Monitors wallet balance and RPC health

**Environment Variables:**
- `PRIVATE_KEY`: Wallet for signing transactions
- `USE_REAL_CHAINLINK=true`: Enables real Chainlink mode

---

## Block Explorers

- Sepolia OriginFeedRelay: https://sepolia.etherscan.io/address/0xee481f6Fad0209880D61a072Ee7307CDC74dCDf8
- Lasna PriceFeedReactor: https://lasna-scan.rkt.ink/address/0x7d6a70f8303385D182ABAd16a8159B6A27FE6B25
- Lasna DestinationFeedProxy: https://lasna-scan.rkt.ink/address/0x9Fd448E930cE937d8dDCdF6e4F5bE8B9C6aF3581

---

## Deployment Date
December 2, 2025
