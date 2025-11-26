// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OriginFeedRelay
 * @notice Monitors a Chainlink price feed and emits events for reactive cross-chain mirroring
 * @dev Implements temporal drift detection and predictive update triggering
 */
contract OriginFeedRelay is Ownable, ReentrancyGuard {
    struct FeedMetadata {
        string description;
        uint8 decimals;
        uint256 version;
        uint256 lastUpdateTimestamp;
        uint256 updateCount;
    }

    struct PriceUpdate {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
        uint256 blockNumber;
        bytes32 messageHash;
    }

    AggregatorV3Interface public immutable priceFeed;
    FeedMetadata public feedMetadata;
    
    uint256 public constant DRIFT_THRESHOLD = 100;
    uint256 public constant STALENESS_THRESHOLD = 3600;
    uint256 public minUpdateInterval = 60;
    
    mapping(uint80 => PriceUpdate) public priceUpdates;
    uint80 public latestRoundId;
    
    event PriceUpdateEmitted(
        uint80 indexed roundId,
        int256 answer,
        uint256 updatedAt,
        uint8 decimals,
        string description,
        bytes32 messageHash,
        uint256 confidence
    );
    
    event TemporalDriftDetected(
        uint80 roundId,
        uint256 expectedTime,
        uint256 actualTime,
        uint256 driftMagnitude
    );
    
    event FeedMetadataUpdated(
        string description,
        uint8 decimals,
        uint256 version
    );

    error StaleUpdate();
    error InvalidRoundId();
    error UpdateTooFrequent();
    error InvalidPrice();

    constructor(
        address _priceFeed,
        string memory _description
    ) Ownable(msg.sender) {
        require(_priceFeed != address(0), "Invalid feed address");
        priceFeed = AggregatorV3Interface(_priceFeed);
        
        uint8 decimals = priceFeed.decimals();
        
        feedMetadata = FeedMetadata({
            description: _description,
            decimals: decimals,
            version: 1,
            lastUpdateTimestamp: block.timestamp,
            updateCount: 0
        });
        
        emit FeedMetadataUpdated(_description, decimals, 1);
    }

    /**
     * @notice Fetch latest price data from Chainlink and emit event for reactive mirroring
     * @dev Includes temporal drift detection and confidence scoring
     */
    function relayLatestPrice() external nonReentrant {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        if (roundId <= latestRoundId) revert InvalidRoundId();
        if (updatedAt == 0) revert StaleUpdate();
        if (answer <= 0) revert InvalidPrice();
        if (block.timestamp < feedMetadata.lastUpdateTimestamp + minUpdateInterval) {
            revert UpdateTooFrequent();
        }
        
        uint256 confidence = _calculateConfidence(roundId, updatedAt);
        
        _detectTemporalDrift(roundId, updatedAt);
        
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                roundId,
                answer,
                updatedAt,
                feedMetadata.decimals,
                feedMetadata.description,
                block.chainid,
                feedMetadata.version
            )
        );
        
        priceUpdates[roundId] = PriceUpdate({
            roundId: roundId,
            answer: answer,
            startedAt: startedAt,
            updatedAt: updatedAt,
            answeredInRound: answeredInRound,
            blockNumber: block.number,
            messageHash: messageHash
        });
        
        latestRoundId = roundId;
        feedMetadata.lastUpdateTimestamp = block.timestamp;
        feedMetadata.updateCount++;
        
        emit PriceUpdateEmitted(
            roundId,
            answer,
            updatedAt,
            feedMetadata.decimals,
            feedMetadata.description,
            messageHash,
            confidence
        );
    }

    /**
     * @notice Calculate confidence score based on update freshness and consistency
     * @param roundId Current round ID
     * @param updatedAt Timestamp of the update
     * @return confidence score (0-10000, representing 0-100%)
     */
    function _calculateConfidence(
        uint80 roundId,
        uint256 updatedAt
    ) internal view returns (uint256) {
        uint256 timeSinceUpdate = block.timestamp - updatedAt;
        
        if (timeSinceUpdate > STALENESS_THRESHOLD) {
            return 5000;
        }
        
        uint256 freshnessScore = 10000 - (timeSinceUpdate * 10000) / STALENESS_THRESHOLD;
        
        uint256 consistencyScore = 10000;
        if (latestRoundId > 0 && roundId > latestRoundId + 1) {
            consistencyScore = 7000;
        }
        
        return (freshnessScore + consistencyScore) / 2;
    }

    /**
     * @notice Detect temporal drift between expected and actual update times
     * @param roundId Current round ID
     * @param updatedAt Actual update timestamp
     */
    function _detectTemporalDrift(uint80 roundId, uint256 updatedAt) internal {
        if (latestRoundId == 0) return;
        
        uint256 expectedInterval = (updatedAt - priceUpdates[latestRoundId].updatedAt);
        uint256 actualInterval = block.timestamp - feedMetadata.lastUpdateTimestamp;
        
        if (expectedInterval == 0) return;
        
        uint256 driftMagnitude = actualInterval > expectedInterval
            ? ((actualInterval - expectedInterval) * 10000) / expectedInterval
            : ((expectedInterval - actualInterval) * 10000) / expectedInterval;
        
        if (driftMagnitude > DRIFT_THRESHOLD) {
            emit TemporalDriftDetected(
                roundId,
                expectedInterval,
                actualInterval,
                driftMagnitude
            );
        }
    }

    /**
     * @notice Get price data for a specific round
     * @param _roundId The round ID to query
     */
    function getPriceUpdate(uint80 _roundId) external view returns (PriceUpdate memory) {
        return priceUpdates[_roundId];
    }

    /**
     * @notice Update minimum update interval (owner only)
     * @param _interval New minimum interval in seconds
     */
    function setMinUpdateInterval(uint256 _interval) external onlyOwner {
        require(_interval >= 30, "Interval too short");
        minUpdateInterval = _interval;
    }

    /**
     * @notice Get current feed metadata
     */
    function getFeedMetadata() external view returns (FeedMetadata memory) {
        return feedMetadata;
    }
}
