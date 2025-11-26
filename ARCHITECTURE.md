# Cross-Chain Price Relay Using Reactive Contracts

## Problem We Solve

### Real-World Scenario
A lending protocol on Chain A needs real-time ETH/USD prices to calculate collateral ratios. Prices update on Chainlink feeds on multiple chains, but:

1. **Current (Without RC):**
   - Manual API calls every 10 seconds (expensive)
   - 1-2 minute delay before destination receives update
   - Risk of liquidating at wrong price
   - Multiple relayers creating duplicate entries
   - Each relayer is a potential attack vector

2. **With Reactive Contracts:**
   - Automatic trigger when price changes (instant)
   - Atomic cross-chain synchronization
   - No duplicates, no manual coordination
   - Decentralized validation

### Why This Is Impossible Without RC

Standard smart contracts cannot:
```solidity
// ❌ This is impossible in normal Solidity:
contract StandardContract {
    // Can't listen to other chains
    function onPriceChangeFromOtherChain(uint256 newPrice) {
        // How would this function be called?
        // Contract has no way to monitor external events
        // Requires external watcher (centralized)
    }
}
```

With Reactive Contracts:
```
[Origin Event] ──▶ [RC listens automatically] ──▶ [Triggers destination]
(No external service needed, no manual polling)
```

## System Components

### 1. Origin Chain (MockPriceFeed)
**Purpose**: Simulates Chainlink price feeds
**Function**: `setPrice(int256 _price)`
**Safety**:
- Rejects price ≤ 0
- Enforces 30-second minimum interval between updates

### 2. Origin Relay (OriginFeedRelay)
**Purpose**: Monitors MockPriceFeed and emits events for RC to listen to
**Workflow**:
1. Monitors MockPriceFeed.latestRoundData()
2. Validates price > 0
3. Validates price not stale (>1 hour)
4. Emits `PriceUpdateEmitted` event
5. RC detects this event

**Event Signature**:
```solidity
event PriceUpdateEmitted(
    uint80 indexed roundId,
    int256 answer,
    uint256 updatedAt,
    uint8 decimals,
    string description,
    bytes32 messageHash,
    uint256 confidence
);
```

### 3. Reactive Contract (PriceFeedReactor)
**Purpose**: The actual Reactive Contract that listens and relays
**Logic**:
1. Subscribes to OriginFeedRelay events
2. Listens for `PriceUpdateEmitted` events
3. Validates event data
4. Calls `DestinationFeedProxy.updatePrice()`
5. Tracks temporal drift and confidence

**Why This Is The Game Changer**:
- RC automatically executes when event fires
- No external service
- Guaranteed execution by validators
- Atomic cross-chain operation

### 4. Destination (DestinationFeedProxy)
**Purpose**: Receives and stores relayed prices
**Safety Layers**:
1. Only authorized relayer (RC) can update
2. Rejects price ≤ 0
3. Rejects price older than 1 hour
4. Detects anomalous changes (>10% jump)
5. Emits events for downstream consumers

## Data Flow Step-by-Step

### Step 1: Price Update on Origin
```
User calls: MockPriceFeed.setPrice(2500e8)
├─ Validates: 2500 > 0 ✅
├─ Updates: mockPrice = 2500e8
├─ Increments: roundId++
└─ Emits: PriceUpdated(2500e8, roundId)
```

### Step 2: Relay Prepares Event
```
User calls: OriginFeedRelay.relayLatestPrice()
├─ Fetches: latestRoundData() from MockPriceFeed
├─ Validates:
│  ├─ roundId > latestRoundId ✅
│  ├─ answer > 0 ✅
│  ├─ block.timestamp - updatedAt < 3600 ✅
│  └─ block.timestamp > lastUpdate + 60 ✅
├─ Constructs: messageHash (price signature)
├─ Stores: priceUpdates[roundId]
└─ Emits: PriceUpdateEmitted(roundId, answer, ...)
```

### Step 3: Reactive Contract Picks Up Event
```
RC Listener (Automatic)
├─ Detects: PriceUpdateEmitted event
├─ Extracts: roundId, answer, updatedAt, etc.
├─ Validates:
│  ├─ Confidence score > threshold
│  ├─ No replay (roundId not processed)
│  └─ Temporal consistency
├─ Prepares: callDestination()
└─ Executes: Calls DestinationFeedProxy.updatePrice()
```

### Step 4: Destination Receives & Stores
```
Destination.updatePrice(roundId, answer, ...)
├─ Validates:
│  ├─ Only RC can call ✅
│  ├─ answer > 0 ✅
│  ├─ block.timestamp - updatedAt < 3600 ✅
│  └─ Not paused ✅
├─ Stores: rounds[roundId] = RoundData(...)
├─ Updates: latestRound = roundId
└─ Emits: PriceUpdated(roundId, answer, ...)
```

### Step 5: Verification
```
Consumer reads: DestinationFeedProxy.latestRoundData()
└─ Returns: (roundId, answer=2500e8, ...)

✅ Price successfully relayed from Origin → RC → Destination
```

## Reactive Contracts = Solver

### Problems Solved ✅

1. **Synchronization**: Prices atomic across chains
2. **Automation**: No manual coordination needed
3. **Decentralization**: RC validators execute it
4. **Efficiency**: Only executes when needed
5. **Security**: Multiple validation layers
6. **Reliability**: RC guarantees execution

### Why This Matters

- **DeFi**: Lending protocols get real-time collateral prices
- **Trading**: DEXes update prices automatically
- **Liquidations**: Happen at correct prices, not stale ones
- **Bridges**: Can be rebuilt on RC for trustless execution
- **Oracles**: Decentralized price feeds with instant relay

## Limitations Without RC

| Requirement | Standard Contracts | Reactive Contracts |
|------------|-------------------|-------------------|
| Cross-chain events | ❌ Impossible | ✅ Native |
| Automatic execution | ❌ Need external service | ✅ Built-in |
| Decentralized validation | ❌ Single relayer | ✅ Validators |
| Cost | ❌ Always-on server | ✅ Pay-per-execution |
| Latency | ❌ Seconds to minutes | ✅ Sub-block |
| Complexity | ❌ Custom integration | ✅ Declarative rules |

## Real Execution Timeline

```
Block 1000 (Origin Chain):
└─ setPrice(2500) ──▶ Emits PriceUpdated

Block 1001 (Origin Chain):
└─ relayLatestPrice() ──▶ Emits PriceUpdateEmitted

Block 5000 (Reactive Network):
└─ RC detects event ──▶ Initiates cross-chain call

Block 2000 (Destination Chain):
└─ updatePrice() executes ──▶ Price stored ✅

Total Latency: ~30 seconds (vs 1-2 minutes manually)
```

## Production Considerations

- Set appropriate staleness thresholds (currently 1 hour)
- Monitor gas prices on each chain
- Plan RC upgrade path for new token types
- Document emergency pause procedures
- Test with real price volatility patterns
