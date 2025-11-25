# MOC System Diagrams

## End-to-End Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE WORKFLOW                                   │
└──────────────────────────────────────────────────────────────────────────────┘

Step 1: Trigger Relay
┌─────────────┐
│   User/Bot  │
└──────┬──────┘
       │ relayLatestPrice()
       ▼
┌─────────────────────────────┐
│   OriginFeedRelay (Sepolia) │
│                             │
│  1. Read Chainlink feed     │
│  2. Calculate confidence    │
│  3. Detect temporal drift   │
│  4. Create message hash     │
│  5. Emit event              │
└──────────┬──────────────────┘
           │
           │ Event: PriceUpdateEmitted
           │   - roundId: 18446744073709561829
           │   - answer: 200132000000
           │   - updatedAt: 1732540123
           │   - confidence: 9500
           │   - messageHash: 0xabc123...
           │
           ▼

Step 2: Event Detection
┌─────────────────────────────┐
│  Reactive Network           │
│  ┌─────────────────────┐    │
│  │ Event Listener      │    │
│  │ Latency: ~2s        │    │
│  └─────────┬───────────┘    │
│            │                │
│            ▼                │
│  ┌─────────────────────┐    │
│  │ PriceFeedReactor    │    │
│  │                     │    │
│  │ 1. Confidence check │    │
│  │    9500 >= 5000 ✓   │    │
│  │                     │    │
│  │ 2. Replay check     │    │
│  │    Not processed ✓  │    │
│  │                     │    │
│  │ 3. Temporal update  │    │
│  │    Drift: 5s ✓      │    │
│  │                     │    │
│  │ 4. Create relay     │    │
│  └─────────┬───────────┘    │
└────────────┼─────────────────┘
             │
             │ Cross-chain message
             │ Destination: 0xDc64...cF6C9
             │ Payload: updatePrice(...)
             │
             ▼

Step 3: Destination Update
┌──────────────────────────────────┐
│  DestinationFeedProxy (Base)     │
│                                  │
│  1. Validate relayer authorized  │
│     0x9fE4...a6e0 ∈ authorized ✓ │
│                                  │
│  2. Validate round sequence      │
│     roundId > latestRound ✓      │
│                                  │
│  3. Validate answer > 0          │
│     200132000000 > 0 ✓           │
│                                  │
│  4. Check anomaly                │
│     |Δ| < 50% ✓                  │
│                                  │
│  5. Store round data             │
│  6. Update latestRound           │
│  7. Emit PriceUpdated            │
└──────────────┬───────────────────┘
               │
               │ Feed available
               │
               ▼

Step 4: Consumer Access
┌──────────────────────────────┐
│   Consumer DApp              │
│                              │
│   latestRoundData()          │
│   ↓                          │
│   Returns:                   │
│   - roundId: 1844...1829     │
│   - answer: 200132000000     │
│   - updatedAt: 1732540123    │
│   - decimals: 8              │
│                              │
│   Price: $2,001.32 ✓         │
└──────────────────────────────┘

Total Latency: ~5 seconds
```

## State Transitions

```
┌──────────────────────────────────────────────────────────────────┐
│                    Relay State Machine                           │
└──────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │   PENDING   │
                    │   RELAY     │
                    └──────┬──────┘
                           │
                           │ Attempt 1
                           ▼
              ┌────────────────────────┐
          ┌───┤  Attempt Relay         │
          │   │  Gas: 127k             │
          │   └────────┬───────────────┘
          │            │
          │            ├─────SUCCESS────┐
          │            │                │
          │            │                ▼
          │            │        ┌───────────────┐
          │            │        │   PROCESSED   │
          │            │        │   ✓ Complete  │
          │            │        └───────────────┘
          │            │
          │            └─────FAIL──────┐
          │                            │
          │                   Wait 30s │
          │                            │
          │                            ▼
          │                 ┌──────────────────┐
          │                 │   Attempt 2      │
          │                 └──────┬───────────┘
          │                        │
          │                        ├────SUCCESS────┐
          │                        │               │
          │                        │               ▼
          │                        │      ┌─────────────┐
          │                        │      │  PROCESSED  │
          │                        │      │  ✓ Retry 2  │
          │                        │      └─────────────┘
          │                        │
          │                        └────FAIL────┐
          │                                     │
          │                            Wait 30s │
          │                                     │
          │                                     ▼
          │                          ┌─────────────────┐
          │                          │   Attempt 3     │
          │                          └─────┬───────────┘
          │                                │
          │                                ├──SUCCESS──┐
          │                                │           │
          │                                │           ▼
          │                                │   ┌────────────┐
          │                                │   │ PROCESSED  │
          │                                │   │ ✓ Retry 3  │
          │                                │   └────────────┘
          │                                │
          │                                └──FAIL─────┐
          │                                            │
          │                                            ▼
          │                                   ┌────────────────┐
          └───────────────────────────────────┤   FAILED       │
                                              │   Max attempts │
                                              │   Manual retry │
                                              └────────────────┘
```

## Confidence Score Calculation

```
┌──────────────────────────────────────────────────────────────────┐
│                 Confidence Scoring Logic                         │
└──────────────────────────────────────────────────────────────────┘

Input:
  • roundId: Current round
  • updatedAt: Timestamp
  • latestRound: Previous round

Step 1: Calculate Freshness Score
  timeSinceUpdate = block.timestamp - updatedAt
  
  if (timeSinceUpdate > 3600):
      freshnessScore = 5000  // Minimum
  else:
      freshnessScore = 10000 - (timeSinceUpdate × 10000 / 3600)
  
  Example:
    timeSinceUpdate = 300s (5 minutes)
    freshnessScore = 10000 - (300 × 10000 / 3600)
                   = 10000 - 833
                   = 9167

Step 2: Calculate Consistency Score
  if (latestRound == 0):  // First update
      consistencyScore = 10000
  else if (roundId == latestRound + 1):  // Sequential
      consistencyScore = 10000
  else:  // Gap detected
      consistencyScore = 7000

  Example:
    latestRound = 100
    roundId = 101
    consistencyScore = 10000  // Sequential ✓

Step 3: Compute Final Score
  confidence = (freshnessScore + consistencyScore) / 2
  
  Example:
    confidence = (9167 + 10000) / 2
               = 9583 / 10000
               = 95.83%

Step 4: Validation
  if (confidence < 5000):
      REJECT  // Below minimum threshold
  else:
      ACCEPT  // Relay to destination

┌────────────────────────────────┐
│  Confidence Ranges             │
├────────────────────────────────┤
│  9000-10000: Excellent ✓       │
│  7000-9000:  Good ✓            │
│  5000-7000:  Acceptable ✓      │
│  0-5000:     Rejected ✗        │
└────────────────────────────────┘
```

## Temporal Drift Detection

```
┌──────────────────────────────────────────────────────────────────┐
│              Temporal Drift Guard Mechanism                      │
└──────────────────────────────────────────────────────────────────┘

Timeline:
  T0: Round 100 at 1732540000
  T1: Round 101 at 1732540060  (60s later)
  T2: Round 102 at 1732541260  (1200s later!)

Detection:
  expectedInterval = T2 - T1 = 1200s
  actualInterval = block.timestamp - lastUpdate = 1200s
  
  driftMagnitude = |expected - actual| × 10000 / expected
                 = |1200 - 60| × 10000 / 60
                 = 1140 × 10000 / 60
                 = 19000 (1900%)

  if (driftMagnitude > DRIFT_THRESHOLD):  // 100 basis points
      emit TemporalDriftDetected(...)

Temporal State:
  ┌────────────────────────────────┐
  │ lastOriginUpdate: 1732541260   │
  │ lastDestinationRelay: 1732540068│
  │ cumulativeDrift: 5200s         │
  │ healingAttempts: 0             │
  └────────────────────────────────┘
  
  if (cumulativeDrift > 5000):
      triggerSelfHealing()
      cumulativeDrift = 0
      healingAttempts++

Visualization:
  Expected: ────60s────60s────60s────
  Actual:   ────60s────1200s──────── ← DRIFT!
                       │
                       └──→ Trigger alert
                            Reset counter
                            Continue operation
```

## Security Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                    Defense in Depth                              │
└──────────────────────────────────────────────────────────────────┘

Layer 1: Origin Contract
  ├─ Immutable Chainlink reference
  ├─ Minimum update interval (60s)
  ├─ Gas griefing protection
  └─ Confidence scoring

Layer 2: Reactive Contract
  ├─ Replay protection (processedRounds)
  ├─ Confidence threshold (≥5000)
  ├─ Temporal drift monitoring
  ├─ Self-healing mechanism
  ├─ Retry logic (max 3)
  └─ Idempotency (messageHash)

Layer 3: Destination Contract
  ├─ Relayer authorization whitelist
  ├─ Round ID sequence enforcement
  ├─ Answer validation (> 0)
  ├─ Staleness detection (<3600s)
  ├─ Anomaly detection (< 50% deviation)
  ├─ Emergency pause
  └─ Reentrancy guard

Layer 4: Consumer Protection
  ├─ AggregatorV3Interface standard
  ├─ Revert on stale data
  ├─ Health metrics available
  └─ isStale() check function

Attack → Layer 1 → Layer 2 → Layer 3 → Layer 4 → BLOCKED
```

## Failure Recovery

```
┌──────────────────────────────────────────────────────────────────┐
│                 Self-Healing Workflow                            │
└──────────────────────────────────────────────────────────────────┘

Normal Operation:
  Origin ──→ Reactive ──→ Destination
  Drift: 5s ✓

Drift Accumulation:
  Update 1: Drift +10s  → Cumulative: 10s
  Update 2: Drift +15s  → Cumulative: 25s
  ...
  Update N: Drift +20s  → Cumulative: 5200s ← THRESHOLD!

Self-Healing Triggered:
  ┌─────────────────────────┐
  │ 1. Emit alert           │
  │ 2. Reset cumulative drift│
  │ 3. Increment counter    │
  │ 4. Log healing attempt  │
  │ 5. Continue operation   │
  └─────────────────────────┘
  
  temporalState.cumulativeDrift = 0
  temporalState.healingAttempts++
  
  emit SelfHealingTriggered(5200, 1, timestamp)

Post-Healing:
  Cumulative: 0s
  Fresh start ✓
  No downtime
  Automatic recovery
```
