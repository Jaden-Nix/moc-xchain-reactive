import { expect } from "chai";
import { ethers, network } from "hardhat";
import { OriginFeedRelay, MockPriceFeed } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("OriginFeedRelay", function () {
  let originRelay: OriginFeedRelay;
  let mockFeed: MockPriceFeed;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  const description = "ETH/USD Test Feed";

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    const MockPriceFeedFactory = await ethers.getContractFactory("MockPriceFeed");
    mockFeed = await MockPriceFeedFactory.deploy("ETH/USD", 8) as unknown as MockPriceFeed;
    await mockFeed.waitForDeployment();
    
    const mockFeedAddress = await mockFeed.getAddress();
    
    const OriginFeedRelayFactory = await ethers.getContractFactory("OriginFeedRelay");
    originRelay = await OriginFeedRelayFactory.deploy(mockFeedAddress, description) as unknown as OriginFeedRelay;
    await originRelay.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await originRelay.owner()).to.equal(owner.address);
    });

    it("Should initialize feed metadata correctly", async function () {
      const metadata = await originRelay.getFeedMetadata();
      expect(metadata.description).to.equal(description);
      expect(metadata.version).to.equal(1);
      expect(metadata.decimals).to.equal(8);
    });

    it("Should set the correct price feed address", async function () {
      expect(await originRelay.priceFeed()).to.equal(await mockFeed.getAddress());
    });
  });

  describe("Configuration", function () {
    it("Should allow owner to set min update interval", async function () {
      await originRelay.setMinUpdateInterval(120);
      expect(await originRelay.minUpdateInterval()).to.equal(120);
    });

    it("Should not allow non-owner to set min update interval", async function () {
      await expect(
        originRelay.connect(addr1).setMinUpdateInterval(120)
      ).to.be.reverted;
    });

    it("Should reject interval that's too short", async function () {
      await expect(
        originRelay.setMinUpdateInterval(20)
      ).to.be.revertedWith("Interval too short");
    });
  });

  describe("Price Updates", function () {
    it("Should store metadata correctly", async function () {
      const metadata = await originRelay.getFeedMetadata();
      expect(metadata.description).to.equal(description);
      expect(metadata.updateCount).to.equal(0);
    });

    it("Should track update count", async function () {
      const metadata = await originRelay.getFeedMetadata();
      expect(metadata.updateCount).to.equal(0);
    });

    it("Should relay price and increment update count", async function () {
      await network.provider.send("evm_increaseTime", [61]);
      await network.provider.send("evm_mine");
      
      await originRelay.relayLatestPrice();
      
      const metadata = await originRelay.getFeedMetadata();
      expect(metadata.updateCount).to.equal(1);
    });

    it("Should reject same round ID", async function () {
      await network.provider.send("evm_increaseTime", [61]);
      await network.provider.send("evm_mine");
      await originRelay.relayLatestPrice();
      
      await expect(originRelay.relayLatestPrice()).to.be.revertedWithCustomError(
        originRelay, "InvalidRoundId"
      );
    });

    it("Should enforce rate limiting", async function () {
      await network.provider.send("evm_increaseTime", [61]);
      await network.provider.send("evm_mine");
      await originRelay.relayLatestPrice();
      
      await mockFeed.setPrice(ethers.parseUnits("2050", 8));
      
      await network.provider.send("evm_increaseTime", [30]);
      await network.provider.send("evm_mine");
      
      await expect(originRelay.relayLatestPrice()).to.be.revertedWithCustomError(
        originRelay, "UpdateTooFrequent"
      );
    });

    it("Should allow update after rate limit period", async function () {
      await network.provider.send("evm_increaseTime", [61]);
      await network.provider.send("evm_mine");
      await originRelay.relayLatestPrice();
      
      await mockFeed.setPrice(ethers.parseUnits("2100", 8));
      
      await network.provider.send("evm_increaseTime", [61]);
      await network.provider.send("evm_mine");
      
      await originRelay.relayLatestPrice();
      
      const metadata = await originRelay.getFeedMetadata();
      expect(metadata.updateCount).to.equal(2);
    });
  });

  describe("Events", function () {
    it("Should emit FeedMetadataUpdated on deployment", async function () {
      const MockPriceFeedFactory = await ethers.getContractFactory("MockPriceFeed");
      const newMockFeed = await MockPriceFeedFactory.deploy("ETH/USD", 8);
      await newMockFeed.waitForDeployment();
      
      const OriginFeedRelayFactory = await ethers.getContractFactory("OriginFeedRelay");
      const newRelay = await OriginFeedRelayFactory.deploy(await newMockFeed.getAddress(), description);
      const receipt = await newRelay.deploymentTransaction()?.wait();
      
      const events = receipt?.logs.filter((log: any) => {
        try {
          return newRelay.interface.parseLog(log)?.name === "FeedMetadataUpdated";
        } catch {
          return false;
        }
      });
      
      expect(events?.length).to.be.greaterThan(0);
    });

    it("Should emit PriceUpdateEmitted on relay", async function () {
      await network.provider.send("evm_increaseTime", [61]);
      await network.provider.send("evm_mine");
      
      await expect(originRelay.relayLatestPrice())
        .to.emit(originRelay, "PriceUpdateEmitted");
    });
  });

  describe("Edge Cases", function () {
    it("Should reject zero address for price feed", async function () {
      const OriginFeedRelayFactory = await ethers.getContractFactory("OriginFeedRelay");
      
      await expect(
        OriginFeedRelayFactory.deploy(ethers.ZeroAddress, description)
      ).to.be.revertedWith("Invalid feed address");
    });

    it("Should handle drift threshold correctly", async function () {
      const threshold = await originRelay.DRIFT_THRESHOLD();
      expect(threshold).to.equal(100);
    });

    it("Should handle staleness threshold correctly", async function () {
      const threshold = await originRelay.STALENESS_THRESHOLD();
      expect(threshold).to.equal(3600);
    });

    it("Should reject invalid round ID (same round)", async function () {
      await network.provider.send("evm_increaseTime", [61]);
      await network.provider.send("evm_mine");
      await originRelay.relayLatestPrice();
      
      await network.provider.send("evm_increaseTime", [61]);
      await network.provider.send("evm_mine");
      
      await expect(originRelay.relayLatestPrice()).to.be.revertedWithCustomError(
        originRelay, "InvalidRoundId"
      );
    });
  });

  describe("Price Data Retrieval", function () {
    it("Should store and retrieve price updates", async function () {
      await network.provider.send("evm_increaseTime", [61]);
      await network.provider.send("evm_mine");
      
      await originRelay.relayLatestPrice();
      
      const latestRoundId = await originRelay.latestRoundId();
      const priceUpdate = await originRelay.getPriceUpdate(latestRoundId);
      
      expect(priceUpdate.roundId).to.equal(latestRoundId);
      expect(priceUpdate.answer).to.equal(ethers.parseUnits("2000", 8));
    });
  });
});
