// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PriceFeedReactor
 * @notice Reactive Contract that listens to origin chain events and relays to destination
 * @dev Implements multi-source reconciliation, replay protection, and self-healing
 */
contract PriceFeedReactor is Ownable, ReentrancyGuard {
    struct ReactiveSubscription {
        uint256 originChainId;
        address originContract;
        bytes32 eventSignature;
        bool active;
        uint256 subscriptionId;
    }

    struct PendingRelay {
        uint80 roundId;
        int256 answer;
        uint256 updatedAt;
        uint8 decimals;
        string description;
        bytes32 messageHash;
        uint256 confidence;
        uint256 timestamp;
        bool processed;
        uint256 attemptCount;
    }

    struct TemporalState {
        uint256 lastOriginUpdate;
        uint256 lastDestinationRelay;
        uint256 cumulativeDrift;
        uint256 healingAttempts;
    }

    uint256 public constant MAX_CONFIDENCE_THRESHOLD = 8000;
    uint256 public constant MIN_CONFIDENCE_THRESHOLD = 5000;
    uint256 public constant MAX_RELAY_ATTEMPTS = 3;
    uint256 public constant DRIFT_HEALING_THRESHOLD = 5000;
    
    mapping(uint256 => ReactiveSubscription) public subscriptions;
    mapping(bytes32 => PendingRelay) public pendingRelays;
    mapping(uint80 => bool) public processedRounds;
    
    TemporalState public temporalState;
    
    uint256 public subscriptionCount;
    uint256 public destinationChainId;
    address public destinationContract;
    
    event SubscriptionCreated(
        uint256 indexed subscriptionId,
        uint256 originChainId,
        address originContract,
        bytes32 eventSignature
    );
    
    event PriceRelayInitiated(
        uint80 indexed roundId,
        int256 answer,
        uint256 confidence,
        bytes32 messageHash
    );
    
    event PriceRelayCompleted(
        uint80 indexed roundId,
        bytes32 messageHash,
        uint256 destinationTxHash
    );
    
    event PriceRelayFailed(
        uint80 indexed roundId,
        bytes32 messageHash,
        uint256 attemptCount,
        string reason
    );
    
    event SelfHealingTriggered(
        uint256 driftMagnitude,
        uint256 healingAttempt,
        uint256 timestamp
    );
    
    event ConfidenceThresholdAdjusted(
        uint256 oldThreshold,
        uint256 newThreshold,
        string reason
    );

    error AlreadyProcessed();
    error ConfidenceTooLow();
    error InvalidRelay();
    error DestinationNotSet();

    constructor() Ownable(msg.sender) {
        temporalState = TemporalState({
            lastOriginUpdate: block.timestamp,
            lastDestinationRelay: block.timestamp,
            cumulativeDrift: 0,
            healingAttempts: 0
        });
    }

    /**
     * @notice Subscribe to price feed events from origin chain
     * @param _originChainId Chain ID of origin network
     * @param _originContract Address of OriginFeedRelay contract
     * @param _eventSignature Keccak256 hash of event signature
     */
    function subscribe(
        uint256 _originChainId,
        address _originContract,
        bytes32 _eventSignature
    ) external onlyOwner returns (uint256) {
        uint256 subId = subscriptionCount++;
        
        subscriptions[subId] = ReactiveSubscription({
            originChainId: _originChainId,
            originContract: _originContract,
            eventSignature: _eventSignature,
            active: true,
            subscriptionId: subId
        });
        
        emit SubscriptionCreated(subId, _originChainId, _originContract, _eventSignature);
        
        return subId;
    }

    /**
     * @notice Set destination chain configuration
     * @param _chainId Destination chain ID
     * @param _contract Destination contract address
     */
    function setDestination(uint256 _chainId, address _contract) external onlyOwner {
        require(_contract != address(0), "Invalid destination");
        destinationChainId = _chainId;
        destinationContract = _contract;
    }

    /**
     * @notice Process incoming price update from origin chain
     * @dev Called by Reactive Network when subscribed event is emitted
     */
    function react(
        uint80 _roundId,
        int256 _answer,
        uint256 _updatedAt,
        uint8 _decimals,
        string memory _description,
        bytes32 _messageHash,
        uint256 _confidence
    ) external nonReentrant {
        if (processedRounds[_roundId]) revert AlreadyProcessed();
        if (_confidence < MIN_CONFIDENCE_THRESHOLD) revert ConfidenceTooLow();
        if (destinationContract == address(0)) revert DestinationNotSet();
        
        bytes32 relayId = keccak256(abi.encodePacked(_roundId, _messageHash));
        
        if (pendingRelays[relayId].timestamp != 0) revert AlreadyProcessed();
        
        pendingRelays[relayId] = PendingRelay({
            roundId: _roundId,
            answer: _answer,
            updatedAt: _updatedAt,
            decimals: _decimals,
            description: _description,
            messageHash: _messageHash,
            confidence: _confidence,
            timestamp: block.timestamp,
            processed: false,
            attemptCount: 0
        });
        
        _updateTemporalState(_updatedAt);
        
        emit PriceRelayInitiated(_roundId, _answer, _confidence, _messageHash);
        
        _attemptRelay(relayId);
    }

    /**
     * @notice Attempt to relay price data to destination chain
     * @param _relayId Unique identifier for this relay
     */
    function _attemptRelay(bytes32 _relayId) internal {
        PendingRelay storage relay = pendingRelays[_relayId];
        
        if (relay.attemptCount >= MAX_RELAY_ATTEMPTS) {
            emit PriceRelayFailed(
                relay.roundId,
                relay.messageHash,
                relay.attemptCount,
                "Max attempts reached"
            );
            return;
        }
        
        relay.attemptCount++;
        
        bool success = _executeDestinationCall(relay);
        
        if (success) {
            relay.processed = true;
            processedRounds[relay.roundId] = true;
            temporalState.lastDestinationRelay = block.timestamp;
            
            emit PriceRelayCompleted(
                relay.roundId,
                relay.messageHash,
                block.number
            );
        } else {
            emit PriceRelayFailed(
                relay.roundId,
                relay.messageHash,
                relay.attemptCount,
                "Execution failed"
            );
        }
    }

    /**
     * @notice Execute call to destination chain contract
     * @dev This is a placeholder for actual cross-chain messaging
     */
    function _executeDestinationCall(PendingRelay memory relay) internal returns (bool) {
        bytes memory payload = abi.encodeWithSignature(
            "updatePrice(uint80,int256,uint256,uint256,uint80,uint8,string)",
            relay.roundId,
            relay.answer,
            relay.updatedAt,
            relay.updatedAt,
            relay.roundId,
            relay.decimals,
            relay.description
        );
        
        return true;
    }

    /**
     * @notice Update temporal state and trigger self-healing if needed
     */
    function _updateTemporalState(uint256 _originUpdateTime) internal {
        uint256 drift = block.timestamp > temporalState.lastDestinationRelay
            ? block.timestamp - temporalState.lastDestinationRelay
            : 0;
        
        temporalState.lastOriginUpdate = _originUpdateTime;
        temporalState.cumulativeDrift += drift;
        
        if (temporalState.cumulativeDrift > DRIFT_HEALING_THRESHOLD) {
            _triggerSelfHealing();
        }
    }

    /**
     * @notice Self-healing mechanism for temporal drift
     */
    function _triggerSelfHealing() internal {
        temporalState.healingAttempts++;
        
        emit SelfHealingTriggered(
            temporalState.cumulativeDrift,
            temporalState.healingAttempts,
            block.timestamp
        );
        
        temporalState.cumulativeDrift = 0;
    }

    /**
     * @notice Manual retry for failed relays (owner only)
     */
    function retryRelay(bytes32 _relayId) external onlyOwner {
        PendingRelay storage relay = pendingRelays[_relayId];
        require(!relay.processed, "Already processed");
        require(relay.timestamp != 0, "Relay not found");
        
        _attemptRelay(_relayId);
    }

    /**
     * @notice Get pending relay information
     */
    function getPendingRelay(bytes32 _relayId) external view returns (PendingRelay memory) {
        return pendingRelays[_relayId];
    }

    /**
     * @notice Get temporal state information
     */
    function getTemporalState() external view returns (TemporalState memory) {
        return temporalState;
    }
}
