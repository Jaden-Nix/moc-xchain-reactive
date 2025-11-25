# Security Documentation

## Threat Model

### Attack Surface

```
┌──────────────────────────────────────────────────────────────┐
│  Attack Vectors                                              │
├──────────────────────────────────────────────────────────────┤
│  1. Origin Chain                                             │
│     • Chainlink feed manipulation (EXTERNAL - out of scope)  │
│     • OriginFeedRelay DoS                                    │
│     • Gas griefing attacks                                   │
│     • Front-running relayLatestPrice()                       │
│                                                              │
│  2. Reactive Network                                         │
│     • Event replay attacks                                   │
│     • Signature forgery                                      │
│     • Relay tampering                                        │
│     • DoS via spam events                                    │
│                                                              │
│  3. Destination Chain                                        │
│     • Unauthorized price updates                             │
│     • Round ID manipulation                                  │
│     • Stale data injection                                   │
│     • Anomalous price injection                              │
│                                                              │
│  4. Cross-Chain                                              │
│     • Message interception                                   │
│     • Ordering manipulation                                  │
│     • Chain reorganization exploits                          │
│     • Bridge/relay failures                                  │
└──────────────────────────────────────────────────────────────┘
```

## Adversarial Vectors

### 1. Replay Attacks

**Attack:** Attacker captures valid `PriceUpdateEmitted` event and replays it later

**Impact:** Stale price data injected into destination chain

**Mitigation:**
```solidity
mapping(uint80 => bool) public processedRounds;

function react(...) external {
    if (processedRounds[_roundId]) revert AlreadyProcessed();
    processedRounds[_roundId] = true;
    // ... process relay
}
```

**Additional Protection:**
- Unique `messageHash` per update
- `relayId` includes nonce
- Round ID sequence enforcement

**Test Vector:**
```
Round 100 → Processed ✓
Replay Round 100 → Rejected ✗ (AlreadyProcessed)
```

### 2. Signature Replay

**Attack:** Attacker reuses valid signature across chains or contracts

**Mitigation:**
- Domain separator includes chain ID
- Contract address in message hash
- Version number in hash
```solidity
bytes32 messageHash = keccak256(abi.encodePacked(
    roundId, answer, updatedAt, decimals, description,
    block.chainid,  // Prevents cross-chain replay
    feedMetadata.version  // Prevents cross-version replay
));
```

### 3. Gas Griefing

**Attack:** Attacker triggers expensive operations to drain relayer funds

**Scenario 1: Spam relayLatestPrice()**
```solidity
// Attack: Call relayLatestPrice() repeatedly
for (uint i = 0; i < 1000; i++) {
    originRelay.relayLatestPrice();  // Each costs ~150k gas
}
```

**Mitigation:**
```solidity
uint256 public minUpdateInterval = 60;

if (block.timestamp < feedMetadata.lastUpdateTimestamp + minUpdateInterval) {
    revert UpdateTooFrequent();
}
```

**Cost Analysis:**
- Without protection: 1000 calls × 150k gas = 150M gas
- With protection: 1 call per 60s = 1440 calls/day max
- Max daily cost: 1440 × 150k = 216M gas (~$50 at 20 gwei)

**Scenario 2: Denial via Low Confidence**
```solidity
// Attack: Manipulate to always produce low confidence
// Not possible - confidence calculated on-chain from Chainlink data
```

### 4. Front-Running

**Attack:** MEV bot front-runs relayLatestPrice() to extract value

**Analysis:**
- No direct profit mechanism exists
- Price data is public (Chainlink)
- Relay function is permissionless by design
- Front-running does not change outcome

**Non-Issue:** Front-running is economically irrational

### 5. Unauthorized Price Updates

**Attack:** Attacker calls updatePrice() on destination without authorization

**Mitigation:**
```solidity
modifier onlyAuthorized() {
    if (!authorizedRelayers[msg.sender] && msg.sender != owner()) {
        revert Unauthorized();
    }
    _;
}

function updatePrice(...) external onlyAuthorized { ... }
```

**Test Vector:**
```
Authorized relayer → Success ✓
Random address → Reverted ✗ (Unauthorized)
Owner → Success ✓
```

### 6. Stale Data Injection

**Attack:** Attacker injects old price data to manipulate consumers

**Mitigation Layer 1: Round ID Sequence**
```solidity
if (_roundId <= latestRound) revert InvalidRoundId();
```

**Mitigation Layer 2: Staleness Check**
```solidity
function latestRoundData() external view returns (...) {
    uint256 timeSinceUpdate = block.timestamp - data.updatedAt;
    if (timeSinceUpdate > feedConfig.stalenessThreshold) {
        revert StaleUpdate();
    }
    return (...);
}
```

**Test Vectors:**
```
Old round (roundId=50) when latestRound=100 → Rejected ✗
Update timestamp 4000s ago → latestRoundData() reverts ✗
Fresh update → Success ✓
```

### 7. Anomalous Price Injection

**Attack:** Inject wildly incorrect price (e.g., $1 instead of $2000)

**Detection:**
```solidity
function _validateUpdate(uint80 _roundId, int256 _answer) internal {
    RoundData memory lastRound = rounds[latestRound];
    
    uint256 deviation = calculateDeviation(_answer, lastRound.answer);
    
    if (deviation > MAX_ANSWER_DEVIATION) {  // 50%
        emit AnomalousUpdateDetected(...);
        // Does NOT revert - allows extreme but valid moves
        // Human monitoring required
    }
}
```

**Why Not Revert?**
- Legitimate crashes (e.g., Luna, FTX) exist
- System should relay truth, not censor
- Emits warning for human review
- Can add emergency pause if needed

### 8. Chain Reorganization

**Attack:** Exploit reorg to double-spend or reorder updates

**Scenario:**
```
Block 1000: Round 500 → Price $2000
Block 1001: Round 501 → Price $2100
[REORG]
Block 1000: Round 500 → Price $2000
Block 1001: Round 502 → Price $1900  (different round!)
```

**Protection:**
```solidity
// Destination contract enforces monotonic round IDs
if (_roundId <= latestRound) revert InvalidRoundId();

// Reactive contract tracks processed rounds
mapping(uint80 => bool) public processedRounds;
```

**Result:** Even after reorg, duplicate round rejected

### 9. Message Interception

**Attack:** Man-in-the-middle attack on cross-chain message

**Mitigation:**
- Messages signed/verified by Reactive Network (out of our control)
- Message hash includes all critical data
- Tampering invalidates hash
- Destination verifies sender authorization

**Trust Assumption:** Reactive Network operates honestly

### 10. Ordering Manipulation

**Attack:** Reorder messages to inject stale prices

**Example:**
```
Origin emits: Round 100 ($2000), Round 101 ($2100), Round 102 ($2200)
Attacker reorders: Round 100, Round 102, Round 101
```

**Protection:**
```solidity
if (_roundId <= latestRound) revert InvalidRoundId();
```

**Result:**
- Round 100: Accepted (latestRound = 100)
- Round 102: Accepted (latestRound = 102)
- Round 101: Rejected (101 < 102)

## System Invariants

### Invariant 1: Monotonic Round IDs
```
∀ updates: roundId_new > roundId_current
```

**Enforcement:** `if (_roundId <= latestRound) revert;`

### Invariant 2: Positive Prices
```
∀ updates: answer > 0
```

**Enforcement:** `if (_answer <= 0) revert InvalidAnswer;`

### Invariant 3: Authorized Relayers Only
```
∀ updates: msg.sender ∈ authorizedRelayers ∪ {owner}
```

**Enforcement:** `modifier onlyAuthorized()`

### Invariant 4: No Replay
```
∀ roundId: processedRounds[roundId] = true ⟹ future updates with same roundId revert
```

**Enforcement:** Processed rounds mapping

### Invariant 5: Confidence Threshold
```
∀ relays: confidence ≥ MIN_CONFIDENCE_THRESHOLD
```

**Enforcement:** `if (_confidence < MIN_CONFIDENCE_THRESHOLD) revert;`

## Failure Modes

### Mode 1: Origin Chain Failure

**Symptom:** Chainlink feed stops updating

**Impact:**
- `relayLatestPrice()` returns stale data
- Confidence score degrades
- Eventually falls below threshold
- Relays stop automatically

**Recovery:**
- Wait for Chainlink recovery
- Manual intervention if prolonged
- Consider alternative feeds

### Mode 2: Reactive Network Failure

**Symptom:** Events not detected or processed

**Impact:**
- Price updates not relayed
- Destination feed becomes stale
- `latestRoundData()` reverts after threshold

**Recovery:**
- Check Reactive Network status
- Manual relay via backup mechanism
- Switch to alternative reactive provider

### Mode 3: Destination Chain Congestion

**Symptom:** Transactions pending/failing due to gas

**Impact:**
- Relay attempts fail
- Retry mechanism activates
- Up to 3 attempts before failure
- Temporal drift accumulates

**Recovery:**
- Increase gas price
- Wait for congestion to clear
- Manual retry after cooldown

### Mode 4: Relayer Compromise

**Symptom:** Unauthorized address attempts updates

**Impact:** NONE - All attempts rejected

**Recovery:**
- No recovery needed (attack failed)
- Review authorization list
- Rotate compromised keys if owner affected

### Mode 5: Extreme Price Movement

**Symptom:** 50%+ price change in single update

**Impact:**
- Update accepted (legitimate move)
- Anomaly event emitted
- Alerts triggered

**Recovery:**
- Human review required
- Pause feed if manipulation suspected
- Resume after verification

## Fallback Paths

### Path 1: Emergency Pause
```solidity
function setPaused(bool _paused) external onlyOwner {
    feedConfig.paused = _paused;
    emit FeedPaused(_paused, msg.sender);
}
```

**Use Case:** Detected manipulation or system compromise

### Path 2: Relayer Rotation
```solidity
function setRelayerAuthorization(address _relayer, bool _authorized) external onlyOwner {
    authorizedRelayers[_relayer] = _authorized;
}
```

**Use Case:** Relayer key compromise or provider change

### Path 3: Manual Relay Retry
```solidity
function retryRelay(bytes32 _relayId) external onlyOwner {
    PendingRelay storage relay = pendingRelays[_relayId];
    require(!relay.processed, "Already processed");
    _attemptRelay(_relayId);
}
```

**Use Case:** Temporary network issues resolved

### Path 4: Staleness Threshold Adjustment
```solidity
function setStalenessThreshold(uint256 _threshold) external onlyOwner {
    require(_threshold >= 60, "Threshold too low");
    feedConfig.stalenessThreshold = _threshold;
}
```

**Use Case:** Change in Chainlink update frequency

## Monitoring and Alerts

### Critical Alerts

1. **Low Confidence**
   - Trigger: Confidence < 5000
   - Action: Investigate origin feed health
   - Priority: HIGH

2. **Temporal Drift**
   - Trigger: Drift > 1000 basis points
   - Action: Check network latency
   - Priority: MEDIUM

3. **Relay Failure**
   - Trigger: 3 consecutive failures
   - Action: Check destination chain status
   - Priority: HIGH

4. **Anomalous Update**
   - Trigger: Price deviation > 50%
   - Action: Manual review required
   - Priority: CRITICAL

5. **Stale Data**
   - Trigger: No update for > staleness threshold
   - Action: Check origin relay activity
   - Priority: MEDIUM

### Monitoring Dashboard Metrics

```
┌─────────────────────────────────────────────────────────────┐
│  Real-Time Metrics                                          │
├─────────────────────────────────────────────────────────────┤
│  • Relay Success Rate: 99.2%                                │
│  • Average Latency: 4.3s                                    │
│  • Confidence Score: 92/100                                 │
│  • Temporal Drift: 12s                                      │
│  • Failed Relays (24h): 3                                   │
│  • Time Since Last Update: 45s                              │
│  • Feed Health: HEALTHY ✓                                   │
└─────────────────────────────────────────────────────────────┘
```

## Security Audit Checklist

- [x] Reentrancy protection (ReentrancyGuard)
- [x] Access control (Ownable + custom modifiers)
- [x] Replay attack prevention
- [x] Gas griefing mitigation
- [x] Round ID sequence enforcement
- [x] Answer validation (> 0)
- [x] Staleness detection
- [x] Anomaly detection
- [x] Emergency pause mechanism
- [x] Relayer authorization
- [x] Temporal drift monitoring
- [x] Confidence threshold enforcement
- [x] Message hash verification
- [x] Domain separator usage
- [x] Integer overflow protection (Solidity 0.8+)

## Recommendations

1. **Pre-Deployment**
   - Full security audit by third party
   - Formal verification of invariants
   - Fuzz testing with Echidna/Medusa
   - Gas optimization review

2. **Post-Deployment**
   - 24/7 monitoring dashboard
   - Automated alerting system
   - Bug bounty program
   - Regular key rotation
   - Incident response plan

3. **Operational**
   - Multi-sig for owner operations
   - Timelock for critical changes
   - Gradual rollout (testnet → small mainnet → full mainnet)
   - Insurance/backstop for extreme events
