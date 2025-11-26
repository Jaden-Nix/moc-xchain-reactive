# Manual Shell Commands - How to Test Contracts Yourself

## Step 1: Open Hardhat Console
Connect to your local blockchain node:
```bash
npx hardhat console --network localhost
```

## Step 2: Deploy Contracts (Copy & Paste Each Line)

```javascript
// Deploy Mock Price Feed
const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
const mockFeed = await MockPriceFeed.deploy("ETH/USD", 8);
await mockFeed.waitForDeployment();
const mockFeedAddr = await mockFeed.getAddress();
console.log("Mock Feed:", mockFeedAddr);

// Deploy Origin Relay
const OriginFeedRelay = await ethers.getContractFactory("OriginFeedRelay");
const originRelay = await OriginFeedRelay.deploy(mockFeedAddr, "ETH/USD Price Feed Relay");
await originRelay.waitForDeployment();
const originAddr = await originRelay.getAddress();
console.log("Origin Relay:", originAddr);

// Deploy Reactor
const PriceFeedReactor = await ethers.getContractFactory("PriceFeedReactor");
const reactor = await PriceFeedReactor.deploy();
await reactor.waitForDeployment();
const reactorAddr = await reactor.getAddress();
console.log("Reactor:", reactorAddr);

// Deploy Destination
const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
const destination = await DestinationFeedProxy.deploy(8, "ETH/USD Mirrored");
await destination.waitForDeployment();
const destAddr = await destination.getAddress();
console.log("Destination:", destAddr);

// Configure
const eventSig = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
const chainId = (await ethers.provider.getNetwork()).chainId;
await reactor.subscribe(chainId, originAddr, eventSig);
await destination.setRelayerAuthorization(reactorAddr, true);
console.log("Configured!");
```

## Step 3: Test Price Updates (Copy & Paste Each Block)

### First Price Update ($1500)
```javascript
// 1. Set mock price
await mockFeed.setPrice(ethers.parseUnits("1500", 8));
console.log("✓ Mock price set to $1500");

// 2. Get the price
let round = await mockFeed.latestRoundData();
console.log("Mock Feed Price: $" + ethers.formatUnits(round[1], 8));

// 3. Advance time
await ethers.provider.send("evm_increaseTime", [65]);
await ethers.provider.send("evm_mine", []);
console.log("✓ Time advanced 65 seconds");

// 4. Relay the price
await originRelay.relayLatestPrice();
console.log("✓ Price relayed");

// 5. Update destination
await destination.updatePrice(round[0], round[1], round[2], round[3], round[4], 8, "ETH/USD Mirrored");
console.log("✓ Destination updated");

// 6. Verify
let destRound = await destination.latestRoundData();
console.log("Destination Price: $" + ethers.formatUnits(destRound[1], 8));
```

### Second Price Update ($1600)
```javascript
await mockFeed.setPrice(ethers.parseUnits("1600", 8));
round = await mockFeed.latestRoundData();
await ethers.provider.send("evm_increaseTime", [65]);
await ethers.provider.send("evm_mine", []);
await originRelay.relayLatestPrice();
await destination.updatePrice(round[0], round[1], round[2], round[3], round[4], 8, "ETH/USD Mirrored");
destRound = await destination.latestRoundData();
console.log("Price: $" + ethers.formatUnits(destRound[1], 8));
```

### Third Price Update ($1700)
```javascript
await mockFeed.setPrice(ethers.parseUnits("1700", 8));
round = await mockFeed.latestRoundData();
await ethers.provider.send("evm_increaseTime", [65]);
await ethers.provider.send("evm_mine", []);
await originRelay.relayLatestPrice();
await destination.updatePrice(round[0], round[1], round[2], round[3], round[4], 8, "ETH/USD Mirrored");
destRound = await destination.latestRoundData();
console.log("Price: $" + ethers.formatUnits(destRound[1], 8));
```

## Step 4: Exit Console
```
.exit
```

## Quick Reference - What Each Line Does

| Command | What it does |
|---------|------------|
| `mockFeed.setPrice(...)` | Update the mock price |
| `latestRoundData()` | Get current price data |
| `evm_increaseTime` | Fast-forward blockchain time |
| `evm_mine` | Mine a new block |
| `relayLatestPrice()` | Send price from origin to destination |
| `updatePrice(...)` | Store price on destination contract |
| `ethers.parseUnits()` | Convert human price to contract format (with decimals) |
| `ethers.formatUnits()` | Convert contract format back to human readable |

## Common Issues

**"UpdateTooFrequent()" error?**
→ You forgot to advance time. Run: `await ethers.provider.send("evm_increaseTime", [65]); await ethers.provider.send("evm_mine", []);`

**"InvalidRoundId()" error?**
→ Make sure you got the latest round before relaying. Run: `round = await mockFeed.latestRoundData();`

**Want to check current values?**
```javascript
// Check mock feed
await mockFeed.latestRoundData()

// Check destination
await destination.latestRoundData()

// Check relay metadata
await originRelay.getFeedMetadata()
```
