// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title DestinationFeedProxy
 * @notice Mirrors Chainlink price feed data on destination chain
 * @dev Implements AggregatorV3Interface for full Chainlink compatibility
 */
contract DestinationFeedProxy is AggregatorV3Interface, Ownable, ReentrancyGuard {
    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    struct FeedConfig {
        uint8 decimals;
        string description;
        uint256 version;
        uint256 stalenessThreshold;
        bool paused;
    }

    FeedConfig public feedConfig;
    
    mapping(uint80 => RoundData) private rounds;
    mapping(address => bool) public authorizedRelayers;
    
    uint80 public latestRound;
    uint256 public lastUpdateBlock;
    uint256 public totalUpdates;
    
    uint256 public constant DEFAULT_STALENESS_THRESHOLD = 3600;
    uint256 public maxAnswerDeviation = 5000; // 50% in basis points - configurable for real market volatility
    
    event PriceUpdated(
        uint80 indexed roundId,
        int256 answer,
        uint256 updatedAt,
        address relayer
    );
    
    event RelayerAuthorized(address indexed relayer, bool authorized);
    
    event StaleDataDetected(
        uint80 roundId,
        uint256 timeSinceUpdate,
        uint256 threshold
    );
    
    event AnomalousUpdateDetected(
        uint80 roundId,
        int256 newAnswer,
        int256 previousAnswer,
        uint256 deviationBps
    );
    
    event FeedPaused(bool paused, address by);

    error Unauthorized();
    error InvalidRoundId();
    error StaleUpdate();
    error FeedIsPaused();
    error InvalidAnswer();
    error DeviationTooHigh();

    modifier onlyAuthorized() {
        if (!authorizedRelayers[msg.sender] && msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }

    modifier whenNotPaused() {
        if (feedConfig.paused) revert FeedIsPaused();
        _;
    }

    constructor(
        uint8 _decimals,
        string memory _description
    ) Ownable(msg.sender) {
        feedConfig = FeedConfig({
            decimals: _decimals,
            description: _description,
            version: 1,
            stalenessThreshold: DEFAULT_STALENESS_THRESHOLD,
            paused: false
        });
    }

    /**
     * @notice Update price data (called by authorized relayer)
     */
    function updatePrice(
        uint80 _roundId,
        int256 _answer,
        uint256 _startedAt,
        uint256 _updatedAt,
        uint80 _answeredInRound,
        uint8 _decimals,
        string memory _description
    ) external onlyAuthorized whenNotPaused nonReentrant {
        if (_roundId <= latestRound) revert InvalidRoundId();
        if (_answer <= 0) revert InvalidAnswer();
        if (_decimals != feedConfig.decimals) revert InvalidAnswer();
        if (block.timestamp - _updatedAt > feedConfig.stalenessThreshold) revert InvalidAnswer();
        
        if (latestRound > 0) {
            _validateUpdate(_roundId, _answer);
        }
        
        rounds[_roundId] = RoundData({
            roundId: _roundId,
            answer: _answer,
            startedAt: _startedAt,
            updatedAt: _updatedAt,
            answeredInRound: _answeredInRound
        });
        
        latestRound = _roundId;
        lastUpdateBlock = block.number;
        totalUpdates++;
        
        emit PriceUpdated(_roundId, _answer, _updatedAt, msg.sender);
    }

    /**
     * @notice Validate update for anomalies and staleness
     */
    function _validateUpdate(uint80 _roundId, int256 _answer) internal {
        RoundData memory lastRound = rounds[latestRound];
        
        uint256 timeSinceUpdate = block.timestamp - lastRound.updatedAt;
        if (timeSinceUpdate > feedConfig.stalenessThreshold * 2) {
            emit StaleDataDetected(_roundId, timeSinceUpdate, feedConfig.stalenessThreshold);
        }
        
        if (lastRound.answer > 0) {
            uint256 deviation = _answer > lastRound.answer
                ? uint256((_answer - lastRound.answer) * 10000 / lastRound.answer)
                : uint256((lastRound.answer - _answer) * 10000 / lastRound.answer);
            
            if (deviation > maxAnswerDeviation) {
                emit AnomalousUpdateDetected(
                    _roundId,
                    _answer,
                    lastRound.answer,
                    deviation
                );
            }
        }
    }

    /**
     * @notice Get latest round data (AggregatorV3Interface)
     */
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        if (latestRound == 0) revert InvalidRoundId();
        
        RoundData memory data = rounds[latestRound];
        
        uint256 timeSinceUpdate = block.timestamp - data.updatedAt;
        if (timeSinceUpdate > feedConfig.stalenessThreshold) {
            revert StaleUpdate();
        }
        
        return (
            data.roundId,
            data.answer,
            data.startedAt,
            data.updatedAt,
            data.answeredInRound
        );
    }

    /**
     * @notice Get data for specific round (AggregatorV3Interface)
     */
    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        RoundData memory data = rounds[_roundId];
        if (data.roundId == 0) revert InvalidRoundId();
        
        return (
            data.roundId,
            data.answer,
            data.startedAt,
            data.updatedAt,
            data.answeredInRound
        );
    }

    /**
     * @notice Get feed decimals (AggregatorV3Interface)
     */
    function decimals() external view override returns (uint8) {
        return feedConfig.decimals;
    }

    /**
     * @notice Get feed description (AggregatorV3Interface)
     */
    function description() external view override returns (string memory) {
        return feedConfig.description;
    }

    /**
     * @notice Get feed version (AggregatorV3Interface)
     */
    function version() external view override returns (uint256) {
        return feedConfig.version;
    }

    /**
     * @notice Authorize or deauthorize a relayer (owner only)
     */
    function setRelayerAuthorization(address _relayer, bool _authorized) external onlyOwner {
        require(_relayer != address(0), "Invalid relayer");
        authorizedRelayers[_relayer] = _authorized;
        emit RelayerAuthorized(_relayer, _authorized);
    }

    /**
     * @notice Pause or unpause the feed (owner only)
     */
    function setPaused(bool _paused) external onlyOwner {
        feedConfig.paused = _paused;
        emit FeedPaused(_paused, msg.sender);
    }

    /**
     * @notice Update staleness threshold (owner only)
     */
    function setStalenessThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold >= 60, "Threshold too low");
        feedConfig.stalenessThreshold = _threshold;
    }

    /**
     * @notice Update max answer deviation (owner only)
     * @param _deviation Maximum deviation in basis points (100 = 1%)
     */
    function setMaxAnswerDeviation(uint256 _deviation) external onlyOwner {
        require(_deviation >= 100 && _deviation <= 10000, "Invalid deviation");
        maxAnswerDeviation = _deviation;
    }

    /**
     * @notice Check if feed data is stale
     */
    function isStale() external view returns (bool) {
        if (latestRound == 0) return true;
        
        RoundData memory data = rounds[latestRound];
        uint256 timeSinceUpdate = block.timestamp - data.updatedAt;
        
        return timeSinceUpdate > feedConfig.stalenessThreshold;
    }

    /**
     * @notice Get feed health metrics
     */
    function getHealthMetrics()
        external
        view
        returns (
            bool healthy,
            uint256 timeSinceUpdate,
            uint256 totalRounds,
            bool isPaused
        )
    {
        if (latestRound == 0) {
            return (false, 0, 0, feedConfig.paused);
        }
        
        RoundData memory data = rounds[latestRound];
        uint256 elapsed = block.timestamp - data.updatedAt;
        bool isHealthy = elapsed <= feedConfig.stalenessThreshold && !feedConfig.paused;
        
        return (isHealthy, elapsed, totalUpdates, feedConfig.paused);
    }
}
