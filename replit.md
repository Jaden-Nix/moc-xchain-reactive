# Cross-Chain Price Relay with Reactive Contracts

## Project Overview

A hackathon-ready demonstration of Reactive Contracts for cross-chain price relay. The system shows how Reactive Contracts automatically synchronize prices from origin chains to destination chains without manual polling or external services.

## Current Status: READY FOR REACTIVE DEPLOYMENT

- ✅ All contracts written & tested (5 test suites pass)
- ✅ Local environment fully functional
- ✅ Deployment script ready
- ✅ Private key secured
- ⏳ Awaiting Reactive Kopli RPC availability (temporary issue)

## Architecture

```
Origin Chain          Reactive Network      Destination Chain
─────────────────     ──────────────────    ──────────────────
MockPriceFeed    →    PriceFeedReactor  →   DestinationProxy
OriginRelay     (Event Listener)
```

## Key Features

### 1. Zero-Price Protection (3 Layers)
- MockPriceFeed rejects price ≤ 0
- OriginFeedRelay rejects price ≤ 0
- DestinationFeedProxy rejects price ≤ 0

### 2. Staleness Detection & Rejection
- OriginFeedRelay: Rejects prices older than 3600 seconds (1 hour)
- DestinationFeedProxy: Rejects prices older than configured threshold

### 3. Reactive Contract Features
- Event-driven (automatic trigger on price change)
- Temporal drift detection
- Confidence scoring
- Multi-source reconciliation
- Replay protection

## Quick Start - Local Testing

Already working - no setup needed:

```bash
# Run local demo with 3 price updates
npx hardhat run scripts/test/multi-price-demo.ts --network localhost

# Test security validations
npx hardhat run scripts/test/zero-price-validation.ts --network localhost
npx hardhat run scripts/test/staleness-rejection.ts --network localhost

# Manual testing
npx hardhat console --network localhost
# Then paste commands from SHELL_TUTORIAL.md
```

## Deployment to Reactive Kopli

See `DEPLOYMENT_READY.md` for complete step-by-step instructions.

**Your wallet:** `0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273`

**Deployment script:** `scripts/deploy/00_deploy_reactive_testnet.ts`

**Network:** Reactive Kopli Testnet (Chain ID: 5318008)

## Test Files

| File | Purpose | Status |
|------|---------|--------|
| `fresh-deploy-and-demo.ts` | Single price update | ✅ Works |
| `multi-price-demo.ts` | 3 sequential prices | ✅ Works |
| `zero-price-validation.ts` | Security: zero rejection | ✅ Works |
| `stale-price-detector.ts` | Security: time drift | ✅ Works |
| `staleness-rejection.ts` | Security: staleness blocking | ✅ Works |
| `edge-case-zero-price.ts` | Edge cases | ✅ Works |

## Smart Contracts

### Origin Chain
- **MockPriceFeed.sol**: Simulates Chainlink feeds
- **OriginFeedRelay.sol**: Monitors and relays prices

### Reactive Network
- **PriceFeedReactor.sol**: Listens to events, triggers destination

### Destination Chain
- **DestinationFeedProxy.sol**: Stores and provides prices

## Documentation

- `ARCHITECTURE.md` - Why RC solves this problem
- `SHELL_TUTORIAL.md` - Manual testing guide
- `SUBMISSION_CHECKLIST.md` - Evidence template
- `REACTIVE_NETWORK_DEPLOYMENT.md` - Deployment guide

## Next Steps

1. Wait ~5-10 min for Reactive RPC to stabilize
2. Get testnet tokens (see DEPLOYMENT_READY.md)
3. Run: `npx hardhat run scripts/deploy/00_deploy_reactive_testnet.ts --network kopli`
4. Record contract addresses and TX hashes
5. Run workflow tests
6. Submit evidence to Reactive Network

## User Preferences

- Direct, practical approach preferred
- Focus on working code over explanation
- Test everything before completion
- Production-grade security (zero-price validation, staleness checks)

## Recent Changes

- Added Reactive Kopli testnet configuration
- Created deployment script with address/TX recording
- Implemented zero-price validation at all 3 layers
- Implemented staleness detection and rejection
- Generated secure wallet for deployment
- Created comprehensive deployment guide

**All contracts ready for Reactive Network deployment!**
