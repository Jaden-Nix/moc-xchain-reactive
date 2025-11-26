// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title MockPriceFeed
 * @notice Mock Chainlink price feed for local testing
 * @dev Returns fake price data for testing cross-chain relay
 */
contract MockPriceFeed is AggregatorV3Interface {
    string public override description;
    uint8 public override decimals;
    uint256 public override version;
    
    int256 public mockPrice = 2000e8; // $2000 ETH
    uint80 public roundId = 1;
    uint256 public lastUpdateTime;
    
    event PriceUpdated(int256 price, uint80 roundId);
    
    constructor(string memory _description, uint8 _decimals) {
        description = _description;
        decimals = _decimals;
        version = 1;
        lastUpdateTime = block.timestamp;
    }
    
    /**
     * @notice Set mock price for testing
     * @dev Rejects zero or negative prices to prevent breaking downstream calculations
     */
    function setPrice(int256 _price) external {
        require(_price > 0, "MockPriceFeed: Price must be greater than 0");
        mockPrice = _price;
        roundId += 1;
        lastUpdateTime = block.timestamp;
        emit PriceUpdated(_price, roundId);
    }
    
    /**
     * @notice Returns the latest price data
     */
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 _roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (roundId, mockPrice, lastUpdateTime, lastUpdateTime, roundId);
    }
    
    /**
     * @notice Returns historical round data
     */
    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundIdReturned,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, mockPrice, lastUpdateTime, lastUpdateTime, _roundId);
    }
}
