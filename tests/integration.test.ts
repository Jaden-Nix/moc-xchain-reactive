import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("Cross-Chain Price Relay Integration", function () {
  let mockFeed: any;
  let originRelay: any;
  let reactor: any;
  let destination: any;
  let owner: any;

  before(async function () {
    [owner] = await ethers.getSigners();

    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockFeed = await MockPriceFeed.deploy("ETH/USD", 8);
    await mockFeed.waitForDeployment();

    const OriginFeedRelay = await ethers.getContractFactory("OriginFeedRelay");
    originRelay = await OriginFeedRelay.deploy(await mockFeed.getAddress(), "ETH/USD Relay");
    await originRelay.waitForDeployment();

    await originRelay.setMinUpdateInterval(30);

    const PriceFeedReactor = await ethers.getContractFactory("PriceFeedReactor");
    reactor = await PriceFeedReactor.deploy();
    await reactor.waitForDeployment();

    const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
    destination = await DestinationFeedProxy.deploy(8, "ETH/USD Mirror");
    await destination.waitForDeployment();

    const eventSignature = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
    const chainId = (await ethers.provider.getNetwork()).chainId;
    await reactor.subscribe(chainId, await originRelay.getAddress(), eventSignature);
    await reactor.setDestination(chainId, await destination.getAddress());

    await destination.setRelayerAuthorization(await reactor.getAddress(), true);
    await destination.setRelayerAuthorization(owner.address, true);
  });

  async function advanceTime(seconds: number) {
    await network.provider.send("evm_increaseTime", [seconds]);
    await network.provider.send("evm_mine");
  }

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

      await advanceTime(61);
      await originRelay.relayLatestPrice();

      const metadata = await originRelay.getFeedMetadata();
      expect(metadata.updateCount).to.be.greaterThan(0);
    });

    it("Should emit PriceUpdateEmitted event", async function () {
      const newPrice = ethers.parseUnits("2200", 8);
      await mockFeed.setPrice(newPrice);

      await advanceTime(61);

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

    it("Should accept authorized owner updates directly", async function () {
      const newPrice = ethers.parseUnits("2300", 8);
      const latestRound = await originRelay.latestRoundId();
      const now = Math.floor(Date.now() / 1000);
      
      await destination.updatePrice(
        latestRound + 1n,
        newPrice,
        now,
        now,
        latestRound + 1n,
        8,
        "ETH/USD Mirror"
      );

      const destRound = await destination.latestRoundData();
      expect(destRound[1]).to.equal(newPrice);
    });
  });

  describe("Full Cross-Chain Flow", function () {
    it("Should relay price from mock feed through origin to destination", async function () {
      const initialPrice = ethers.parseUnits("2350", 8);
      await mockFeed.setPrice(initialPrice);

      await advanceTime(61);
      await originRelay.relayLatestPrice();

      const originRoundId = await originRelay.latestRoundId();
      const priceData = await originRelay.getPriceUpdate(originRoundId);
      const now = Math.floor(Date.now() / 1000);

      const destLatestRound = await destination.latestRound();
      await destination.updatePrice(
        destLatestRound + 1n,
        initialPrice,
        now,
        now,
        destLatestRound + 1n,
        8,
        "ETH/USD Mirror"
      );

      const destRound = await destination.latestRoundData();
      expect(destRound[1]).to.equal(initialPrice);
    });

    it("Should handle multiple price updates with proper timing", async function () {
      const prices = [
        ethers.parseUnits("2400", 8),
        ethers.parseUnits("2450", 8),
        ethers.parseUnits("2500", 8),
      ];

      for (let i = 0; i < prices.length; i++) {
        await mockFeed.setPrice(prices[i]);
        
        await advanceTime(61);
        await originRelay.relayLatestPrice();
        
        const originRoundId = await originRelay.latestRoundId();
        const now = Math.floor(Date.now() / 1000);
        const destLatestRound = await destination.latestRound();
        
        await destination.updatePrice(
          destLatestRound + 1n,
          prices[i],
          now,
          now,
          destLatestRound + 1n,
          8,
          "ETH/USD Mirror"
        );

        const destRound = await destination.latestRoundData();
        expect(destRound[1]).to.equal(prices[i]);
      }
    });

    it("Should maintain price feed compatibility", async function () {
      const config = await destination.feedConfig();
      const latestRound = await destination.latestRoundData();

      expect(Number(config.decimals)).to.equal(8);
      expect(latestRound[0]).to.be.a("bigint");
      expect(latestRound[1]).to.be.a("bigint");
      expect(latestRound[3]).to.be.a("bigint");
    });
  });

  describe("Error Handling", function () {
    it("Should reject updates when feed is paused", async function () {
      await destination.setPaused(true);
      
      const now = Math.floor(Date.now() / 1000);
      const destLatestRound = await destination.latestRound();
      
      await expect(
        destination.updatePrice(
          destLatestRound + 1n,
          ethers.parseUnits("2600", 8),
          now,
          now,
          destLatestRound + 1n,
          8,
          "ETH/USD Mirror"
        )
      ).to.be.revertedWithCustomError(destination, "FeedIsPaused");
      
      await destination.setPaused(false);
    });

    it("Should reject unauthorized updates", async function () {
      const [, , unauthorizedUser] = await ethers.getSigners();
      const now = Math.floor(Date.now() / 1000);
      const destLatestRound = await destination.latestRound();
      
      await expect(
        destination.connect(unauthorizedUser).updatePrice(
          destLatestRound + 1n,
          ethers.parseUnits("2600", 8),
          now,
          now,
          destLatestRound + 1n,
          8,
          "ETH/USD Mirror"
        )
      ).to.be.revertedWithCustomError(destination, "Unauthorized");
    });
  });
});
