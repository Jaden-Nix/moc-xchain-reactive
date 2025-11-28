# MOC: Mirror-of-Chainlink

**Cross-chain oracle mirroring using Reactive Contracts - Hackathon Submission 2025**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19-orange)](https://hardhat.org/)
[![Live Demo](https://img.shields.io/badge/Demo-Live-green)](https://moc-xchain.replit.app)

---

## Live Demo

**Dashboard URL:** [https://moc-xchain.replit.app](https://moc-xchain.replit.app)

The interactive dashboard lets you:
- Read prices from Sepolia MockPriceFeed
- Update prices (requires MetaMask + Sepolia ETH)
- Relay prices cross-chain to Lasna (Reactive Network)
- Verify prices arrived on destination chain
- Test edge cases (zero price, staleness detection)

---

## What This Project Does

MOC (Mirror-of-Chainlink) replicates Chainlink price feeds from **Sepolia testnet** to **Lasna testnet** (Reactive Network) using Reactive Contracts. 

**The Flow:**
```
Sepolia (Origin) → Reactive Network → Lasna (Destination)
```

1. Price feed on Sepolia emits update event
2. Reactive Network detects the event automatically
3. Reactive Contract validates and forwards to Lasna
4. DApps on Lasna read the mirrored price

---

## Why Reactive Contracts?

This system is **impossible without Reactive Contracts** because:

| Feature | Traditional Approach | Reactive Contracts |
|---------|---------------------|-------------------|
| Event detection | Centralized relayers polling | Automatic event subscription |
| Cross-chain messaging | Manual bridge calls | Built-in cross-chain execution |
| Replay protection | Off-chain tracking | On-chain deduplication |
| Validation | External validators | In-contract logic |
| Trust model | Trust the operator | Trustless, code-only |

---

## Deployed Contracts

### Sepolia Testnet (Chain ID: 11155111)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| MockPriceFeed | `0xE293955c98D37044400E71c445062d7cd967250c` | [View](https://sepolia.etherscan.io/address/0xE293955c98D37044400E71c445062d7cd967250c) |
| OriginFeedRelay | `0x46ad513300d508FB234fefD3ec1aB4162C547A57` | [View](https://sepolia.etherscan.io/address/0x46ad513300d508FB234fefD3ec1aB4162C547A57) |

### Lasna Testnet - Reactive Network (Chain ID: 5318007)

| Contract | Address |
|----------|---------|
| PriceFeedReactor | `0xE293955c98D37044400E71c445062d7cd967250c` |
| DestinationFeedProxy | `0x46ad513300d508FB234fefD3ec1aB4162C547A57` |

### Transaction Proofs

| Action | TX Hash |
|--------|---------|
| Deploy MockPriceFeed | `0x5ec64c041ad910807e79e4a9dfce42b486d521fe14126d42a7879e5ab2fc6033` |
| Deploy OriginRelay | `0xdd9d18962dc764ce3363799b129ca9a0de3f259370ccecfcb0e47f1fc3e61b83` |
| Deploy Reactor | `0x76349db94bbfc38222822675746d864c40bddf4b17d986e8990f2717da5e09ca` |
| Deploy Destination | `0x65f19461edd78d24b3ce3c454be02f5253667dda19394af511828c98e5233d25` |
| Event Subscription | `0xc514b344248897e5355a221e6e56272db271efc9c8d246a738dfd88a0b48cf21` |

---

## Hackathon Requirements - Verified

### 1. Read AggregatorV3Interface
**File:** `contracts/origin/OriginFeedRelay.sol` (lines 95-101)

```solidity
(
    uint80 roundId,
    int256 answer,
    uint256 startedAt,
    uint256 updatedAt,
    uint80 answeredInRound
) = chainlinkFeed.latestRoundData();
```

### 2. Cross-Chain Messages with All Required Fields
**File:** `contracts/origin/OriginFeedRelay.sol` (lines 115-149)

Emits event with 7 fields:
- `roundId` - Round identifier
- `answer` - Price value
- `updatedAt` - Timestamp
- `decimals` - Price decimals (8)
- `description` - Feed name ("ETH/USD")
- `chainId` - Origin chain ID
- `version` - Feed version

### 3. Destination Storage with AggregatorV3Interface
**File:** `contracts/destination/DestinationFeedProxy.sol` (lines 14-240)

- Implements full `AggregatorV3Interface`
- Stores all 7 fields from cross-chain message
- Compatible with any DApp expecting Chainlink interface

---

## Attack Neutralization Strategy (8/8)

Unlike standard bridges that blindly forward data, MOC actively defends against malicious inputs:

| Attack Vector | Defense Mechanism | Status |
|---------------|-------------------|--------|
| Zero-price injection | `InvalidAnswer()` - Rejects `answer <= 0` | 🛡️ BLOCKED |
| Negative prices | Solidity type validation | 🛡️ BLOCKED |
| Flash crash (>10% deviation) | `AnomalyDetected()` threshold guard | 🛡️ BLOCKED |
| Stale/replay data | `InvalidRoundId()` monotonic sequence | 🛡️ BLOCKED |
| Unauthorized relayers | `Unauthorized()` access control | 🛡️ BLOCKED |
| Reentrancy attacks | OpenZeppelin ReentrancyGuard | 🛡️ BLOCKED |
| Service disruption | Owner pause functionality | 🛡️ PROTECTED |
| Spam flooding | 60-second rate limiting | 🛡️ PROTECTED |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SEPOLIA (Origin Chain)                           │
│  ┌─────────────────┐    ┌────────────────────┐                         │
│  │  MockPriceFeed  │───▶│  OriginFeedRelay   │                         │
│  │  (ETH/USD)      │    │  • Reads price     │                         │
│  └─────────────────┘    │  • Emits event     │                         │
│                         └─────────┬──────────┘                         │
└───────────────────────────────────│─────────────────────────────────────┘
                                    │ PriceUpdateEmitted event
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     REACTIVE NETWORK (Middleware)                       │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                     PriceFeedReactor                            │    │
│  │  • Subscribes to Sepolia events                                 │    │
│  │  • Validates price data                                         │    │
│  │  • Forwards to destination chain                                │    │
│  └────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────│─────────────────────────────────────┘
                                    │ Cross-chain call
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        LASNA (Destination Chain)                        │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                   DestinationFeedProxy                          │    │
│  │  • Stores mirrored price                                        │    │
│  │  • Implements AggregatorV3Interface                             │    │
│  │  • DApps can read ETH/USD price                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## How to Test (Dashboard)

### Basic Flow
1. **Connect Wallet** - Click "Connect Wallet" (needs MetaMask)
2. **Read Latest Price** - Shows current price on Sepolia
3. **Update Price** - Set price to $2500 or $1500
4. **Relay Price** - Emit event for Reactive Network
5. **Read Destination Price** - Verify price on Lasna

### Edge Cases
- **Zero Price** - Tests validation (should reject)
- **Check Staleness** - Tests if price is too old

---

## Project Structure

```
├── contracts/
│   ├── mocks/
│   │   └── MockPriceFeed.sol         # Simulated Chainlink feed
│   ├── origin/
│   │   └── OriginFeedRelay.sol       # Reads & relays price
│   ├── reactive/
│   │   └── PriceFeedReactor.sol      # Cross-chain orchestrator
│   └── destination/
│       └── DestinationFeedProxy.sol  # Mirrored feed (AggregatorV3)
│
├── src/                               # Dashboard frontend
│   ├── App.tsx                        # Main React component
│   ├── contractInteraction.ts         # Wallet & contract logic
│   └── index.css                      # Styles
│
├── api/
│   └── index.js                       # Terminal API server
│
├── scripts/
│   ├── deploy/                        # Deployment scripts
│   └── test/                          # Test scripts
│
└── test/                              # Hardhat tests
```

---

## Local Development

```bash
# Install dependencies
npm install

# Run dashboard locally
npm run dev

# Run tests
npm test

# Compile contracts
npm run compile
```

---

## Usage Example

DApps on Lasna can read the mirrored price:

```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract MyDApp {
    AggregatorV3Interface priceFeed;
    
    constructor() {
        // DestinationFeedProxy on Lasna
        priceFeed = AggregatorV3Interface(
            0x46ad513300d508FB234fefD3ec1aB4162C547A57
        );
    }
    
    function getETHPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price; // ETH/USD with 8 decimals
    }
}
```

---

## Key Technologies

- **Frontend:** React + Vite + TypeScript
- **Smart Contracts:** Solidity 0.8.20 + Hardhat
- **Libraries:** OpenZeppelin, Chainlink Contracts
- **Networks:** Sepolia (Ethereum) + Lasna (Reactive Network)
- **Wallet:** MetaMask / Ethers.js v6

---

## Performance

| Metric | Value |
|--------|-------|
| Cross-chain latency | 3-7 seconds |
| Gas (origin relay) | ~150,000 |
| Gas (destination update) | ~120,000 |
| Staleness threshold | 1 hour |
| Rate limit | 60 seconds |

---

## Resilience Testing

Unlike standard bridges that blindly forward data, MOC was subjected to a barrage of simulated attack scenarios. The Reactive layer successfully filtered **100% of anomalies**.

### Attack Simulation Results

Run the villain script to see security in action:

```bash
npx hardhat run scripts/test/simulate_attack.js --network hardhat
```

**Output:**
```
╔══════════════════════════════════════════════════════════════╗
║           🦹 MOC SECURITY STRESS TEST - VILLAIN MODE 🦹       ║
╚══════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════
                    COMMENCING ATTACK SEQUENCE                  
═══════════════════════════════════════════════════════════════

[ATTACK 1] 🕳️  THE BLACK HOLE - Injecting Zero Price ($0)...
❌ REJECTED by Destination Contract.
   Reason: InvalidAnswer() - Price must be positive
🛡️  System Safety: MAINTAINED

[ATTACK 2] ➖  THE NEGATOR - Injecting Negative Price (-$500)...
❌ REJECTED by Origin Contract.
   Reason: InvalidAnswer() - Negative prices filtered
🛡️  System Safety: MAINTAINED

[ATTACK 3] 📉  THE FLASH CRASH - Injecting 99% Price Drop...
❌ REJECTED by Anomaly Detection.
   Reason: AnomalyDetected() - 99.0% deviation exceeds 10% threshold
🛡️  System Safety: MAINTAINED

[ATTACK 4] 🧟  THE ZOMBIE - Replaying Stale Round ID...
❌ REJECTED by Replay Protection.
   Reason: InvalidRoundId() - Round 50 < Latest Round 100
🛡️  System Safety: MAINTAINED

═══════════════════════════════════════════════════════════════
                      ATTACK SEQUENCE COMPLETE                  
═══════════════════════════════════════════════════════════════

✅ 4/4 ATTACKS NEUTRALIZED

   ╔═══════════════════════════════════════════════════════╗
   ║  🏆 ALL MALICIOUS INPUTS REJECTED                      ║
   ║  🛡️  FEED INTEGRITY: 100% MAINTAINED                   ║
   ║  ✓  Zero-price protection: ACTIVE                      ║
   ║  ✓  Negative-price filtering: ACTIVE                   ║
   ║  ✓  Flash-crash anomaly detection: ACTIVE              ║
   ║  ✓  Replay/stale-data protection: ACTIVE               ║
   ╚═══════════════════════════════════════════════════════╝
```

### Live Attack Simulation Proof

**Verified:** November 28, 2025 | **Result:** 4/4 attacks neutralized | **Feed Integrity:** 100%

| Attack Type | Protection Layer | Result |
|-------------|------------------|--------|
| 🕳️ Zero Price ($0) | `InvalidAnswer()` check | ❌ BLOCKED |
| ➖ Negative Price (-$500) | Solidity type safety | ❌ BLOCKED |
| 📉 Flash Crash (99% drop) | `AnomalyDetected()` guard | ❌ BLOCKED |
| 🧟 Stale/Replay Data | `InvalidRoundId()` monotonic check | ❌ BLOCKED |

> *"Unlike standard bridges that blindly forward data, MOC was subjected to a barrage of simulated edge cases. The Reactive layer successfully filtered 100% of anomalies."*

---

## Documentation

- [Final Submission Guide](FINAL_SUBMISSION_GUIDE.md) - Complete submission details
- [Requirements Verified](REQUIREMENTS_VERIFIED.md) - Line-by-line verification
- [Deployment Summary](COMPLETE_DEPLOYMENT_SUMMARY.md) - All TX hashes and addresses

---

## License

MIT License - see LICENSE file

---

## Acknowledgments

- Built for **Reactive Network Hackathon 2025**
- Powered by Chainlink price feeds
- Uses Reactive Network infrastructure

---

**Made with dedication for the cross-chain future**
