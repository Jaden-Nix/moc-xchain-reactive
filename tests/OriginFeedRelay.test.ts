import { expect } from "chai";
import { ethers } from "hardhat";
import { OriginFeedRelay } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("OriginFeedRelay", function () {
  let originRelay: OriginFeedRelay;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  const mockFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  const description = "ETH/USD Test Feed";

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    const OriginFeedRelayFactory = await ethers.getContractFactory("OriginFeedRelay");
    originRelay = await OriginFeedRelayFactory.deploy(mockFeedAddress, description);
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
    });

    it("Should set the correct price feed address", async function () {
      expect(await originRelay.priceFeed()).to.equal(mockFeedAddress);
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
  });

  describe("Events", function () {
    it("Should emit FeedMetadataUpdated on deployment", async function () {
      const OriginFeedRelayFactory = await ethers.getContractFactory("OriginFeedRelay");
      
      await expect(OriginFeedRelayFactory.deploy(mockFeedAddress, description))
        .to.emit(OriginFeedRelayFactory, "FeedMetadataUpdated");
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
  });
});
