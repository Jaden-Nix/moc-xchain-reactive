import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cross-Chain Price Relay Integration", function () {
  let mockFeed: any;
  let originRelay: any;
  let reactor: any;
  let destination: any;
  let owner: any;

  before(async function () {
    [owner] = await ethers.getSigners();

    // Deploy Mock Price Feed
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockFeed = await MockPriceFeed.deploy("ETH/USD", 8);
    await mockFeed.waitForDeployment();

    // Deploy Origin Relay
    const OriginFeedRelay = await ethers.getContractFactory("OriginFeedRelay");
    originRelay = await OriginFeedRelay.deploy(await mockFeed.getAddress(), "ETH/USD Relay");
    await originRelay.waitForDeployment();

    // Set minimum update interval to 30 for testing
    await originRelay.setMinUpdateInterval(30);

    // Deploy Reactor
    const PriceFeedReactor = await ethers.getContractFactory("PriceFeedReactor");
    reactor = await PriceFeedReactor.deploy();
    await reactor.waitForDeployment();

    // Deploy Destination
    const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
    destination = await DestinationFeedProxy.deploy(8, "ETH/USD Mirror");
    await destination.waitForDeployment();

    // Configure subscription
    const eventSignature = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
    const chainId = (await ethers.provider.getNetwork()).chainId;
    await reactor.subscribe(chainId, await originRelay.getAddress(), eventSignature);

    // Authorize reactor as relayer
    await destination.setRelayerAuthorization(await reactor.getAddress(), true);
  });

  describe("Mock Price Feed", function () {
    it("Should initialize with default price", async function () {
      const latestRound = await mockFeed.latestRoundData();
      expect(latestRound[1]).to.equal(ethers.parseUnits("2000", 8));
    });

    it("Should update price when setPrice is called", async function () {
      const newPrice = ethers.parseUnits("2500", 8);
      await mockFeed.setPrice(newPrice);

      const latestRound = await mockFeed.latestRoundData();
      expect(latestRound[1]).to.equal(newPrice);
    });
  });

  describe("Origin Relay", function () {
    it("Should relay latest price from mock feed", async function () {
      const newPrice = ethers.parseUnits("2100", 8);
      await mockFeed.setPrice(newPrice);

      await originRelay.relayLatestPrice();

      const metadata = await originRelay.getFeedMetadata();
      expect(metadata.updateCount).to.be.greaterThan(0);
    });

    it("Should emit PriceUpdateEmitted event", async function () {
      const newPrice = ethers.parseUnits("2200", 8);
      await mockFeed.setPrice(newPrice);

      const tx = await originRelay.relayLatestPrice();
      const receipt = await tx.wait();

      const events = receipt!.logs.map((log: any) => {
        try {
          return originRelay.interface.parseLog(log);
        } catch {
          return null;
        }
      }).filter((e: any) => e !== null);

      expect(events.length).to.be.greaterThan(0);
    });
  });

  describe("Destination Feed Proxy", function () {
    it("Should be authorized by owner", async function () {
      const isAuthorized = await destination.authorizedRelayers(await reactor.getAddress());
      expect(isAuthorized).to.be.true;
    });

    it("Should initialize with correct config", async function () {
      const config = await destination.feedConfig();
      expect(config.decimals).to.equal(8);
      expect(config.description).to.equal("ETH/USD Mirror");
      expect(config.paused).to.be.false;
    });

    it("Should accept authorized relayer updates", async function () {
      const newPrice = ethers.parseUnits("2300", 8);
      await mockFeed.setPrice(newPrice);
      await originRelay.relayLatestPrice();

      const latestRound = await destination.latestRoundData();
      expect(latestRound[0]).to.be.greaterThan(0); // Has a round ID
    });
  });

  describe("Full Cross-Chain Flow", function () {
    it("Should relay price from mock feed through origin to destination", async function () {
      // Set initial price on mock feed
      const initialPrice = ethers.parseUnits("2400", 8);
      await mockFeed.setPrice(initialPrice);

      // Relay through origin contract
      await originRelay.relayLatestPrice();

      // Check destination received the update
      const destRound = await destination.latestRoundData();
      expect(destRound[1]).to.equal(initialPrice);
    });

    it("Should handle multiple price updates", async function () {
      this.timeout(120000); // Allow more time
      const prices = [
        ethers.parseUnits("2500", 8),
        ethers.parseUnits("2600", 8),
        ethers.parseUnits("2700", 8),
      ];

      for (let i = 0; i < prices.length; i++) {
        await mockFeed.setPrice(prices[i]);
        
        if (i > 0) {
          // Wait for rate limit between updates
          await new Promise(resolve => setTimeout(resolve, 31000));
        }
        
        await originRelay.relayLatestPrice();

        const destRound = await destination.latestRoundData();
        expect(destRound[1]).to.equal(prices[i]);
      }
    });

    it("Should maintain price feed compatibility", async function () {
      const config = await destination.feedConfig();
      const latestRound = await destination.latestRoundData();

      // Should have AggregatorV3Interface compatible data
      expect(config.decimals).to.be.a("number");
      expect(latestRound[0]).to.be.a("bigint"); // roundId
      expect(latestRound[1]).to.be.a("bigint"); // answer
      expect(latestRound[3]).to.be.a("bigint"); // updatedAt
    });
  });
});
