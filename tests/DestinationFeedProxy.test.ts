import { expect } from "chai";
import { ethers } from "hardhat";
import { DestinationFeedProxy } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("DestinationFeedProxy", function () {
  let feedProxy: DestinationFeedProxy;
  let owner: HardhatEthersSigner;
  let relayer: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  const decimals = 8;
  const description = "ETH/USD Mirrored Feed";

  beforeEach(async function () {
    [owner, relayer, user] = await ethers.getSigners();
    
    const DestinationFeedProxyFactory = await ethers.getContractFactory("DestinationFeedProxy");
    feedProxy = await DestinationFeedProxyFactory.deploy(decimals, description) as unknown as DestinationFeedProxy;
    await feedProxy.waitForDeployment();
    
    await feedProxy.setRelayerAuthorization(relayer.address, true);
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await feedProxy.owner()).to.equal(owner.address);
    });

    it("Should initialize feed config correctly", async function () {
      const config = await feedProxy.feedConfig();
      expect(config.decimals).to.equal(decimals);
      expect(config.description).to.equal(description);
      expect(config.version).to.equal(1);
      expect(config.paused).to.be.false;
    });
  });

  describe("Relayer Authorization", function () {
    it("Should authorize relayer correctly", async function () {
      expect(await feedProxy.authorizedRelayers(relayer.address)).to.be.true;
    });

    it("Should emit RelayerAuthorized event", async function () {
      await expect(feedProxy.setRelayerAuthorization(user.address, true))
        .to.emit(feedProxy, "RelayerAuthorized")
        .withArgs(user.address, true);
    });

    it("Should allow owner to deauthorize relayer", async function () {
      await feedProxy.setRelayerAuthorization(relayer.address, false);
      expect(await feedProxy.authorizedRelayers(relayer.address)).to.be.false;
    });

    it("Should not allow non-owner to authorize relayer", async function () {
      await expect(
        feedProxy.connect(user).setRelayerAuthorization(user.address, true)
      ).to.be.reverted;
    });
  });

  describe("Price Updates", function () {
    it("Should allow authorized relayer to update price", async function () {
      const roundId = 1;
      const answer = ethers.parseUnits("2000", 8);
      const timestamp = Math.floor(Date.now() / 1000);

      await expect(
        feedProxy.connect(relayer).updatePrice(
          roundId,
          answer,
          timestamp,
          timestamp,
          roundId,
          decimals,
          description
        )
      ).to.emit(feedProxy, "PriceUpdated");
    });

    it("Should not allow unauthorized address to update price", async function () {
      const roundId = 1;
      const answer = ethers.parseUnits("2000", 8);
      const timestamp = Math.floor(Date.now() / 1000);

      await expect(
        feedProxy.connect(user).updatePrice(
          roundId,
          answer,
          timestamp,
          timestamp,
          roundId,
          decimals,
          description
        )
      ).to.be.reverted;
    });

    it("Should reject invalid round ID", async function () {
      const roundId = 1;
      const answer = ethers.parseUnits("2000", 8);
      const timestamp = Math.floor(Date.now() / 1000);

      await feedProxy.connect(relayer).updatePrice(
        roundId,
        answer,
        timestamp,
        timestamp,
        roundId,
        decimals,
        description
      );

      await expect(
        feedProxy.connect(relayer).updatePrice(
          roundId,
          answer,
          timestamp,
          timestamp,
          roundId,
          decimals,
          description
        )
      ).to.be.reverted;
    });

    it("Should reject negative answer", async function () {
      const roundId = 1;
      const answer = -1;
      const timestamp = Math.floor(Date.now() / 1000);

      await expect(
        feedProxy.connect(relayer).updatePrice(
          roundId,
          answer,
          timestamp,
          timestamp,
          roundId,
          decimals,
          description
        )
      ).to.be.reverted;
    });
  });

  describe("AggregatorV3Interface", function () {
    beforeEach(async function () {
      const answer = ethers.parseUnits("2000", 8);
      const timestamp = Math.floor(Date.now() / 1000);
      
      await feedProxy.connect(relayer).updatePrice(
        1,
        answer,
        timestamp,
        timestamp,
        1,
        decimals,
        description
      );
    });

    it("Should return correct decimals", async function () {
      expect(await feedProxy.decimals()).to.equal(decimals);
    });

    it("Should return correct description", async function () {
      expect(await feedProxy.description()).to.equal(description);
    });

    it("Should return correct version", async function () {
      expect(await feedProxy.version()).to.equal(1);
    });

    it("Should return latest round data", async function () {
      const [roundId, answer, , , answeredInRound] = await feedProxy.latestRoundData();
      
      expect(roundId).to.equal(1);
      expect(answer).to.equal(ethers.parseUnits("2000", 8));
      expect(answeredInRound).to.equal(1);
    });

    it("Should return specific round data", async function () {
      const [roundId, answer, , , answeredInRound] = await feedProxy.getRoundData(1);
      
      expect(roundId).to.equal(1);
      expect(answer).to.equal(ethers.parseUnits("2000", 8));
      expect(answeredInRound).to.equal(1);
    });
  });

  describe("Feed Pausing", function () {
    it("Should allow owner to pause feed", async function () {
      await expect(feedProxy.setPaused(true))
        .to.emit(feedProxy, "FeedPaused")
        .withArgs(true, owner.address);
      
      const config = await feedProxy.feedConfig();
      expect(config.paused).to.be.true;
    });

    it("Should not allow updates when paused", async function () {
      await feedProxy.setPaused(true);
      
      const roundId = 1;
      const answer = ethers.parseUnits("2000", 8);
      const timestamp = Math.floor(Date.now() / 1000);

      await expect(
        feedProxy.connect(relayer).updatePrice(
          roundId,
          answer,
          timestamp,
          timestamp,
          roundId,
          decimals,
          description
        )
      ).to.be.reverted;
    });
  });

  describe("Health Metrics", function () {
    it("Should report unhealthy when no data", async function () {
      const [healthy] = await feedProxy.getHealthMetrics();
      expect(healthy).to.be.false;
    });

    it("Should report healthy after update", async function () {
      const answer = ethers.parseUnits("2000", 8);
      const timestamp = Math.floor(Date.now() / 1000);
      
      await feedProxy.connect(relayer).updatePrice(
        1,
        answer,
        timestamp,
        timestamp,
        1,
        decimals,
        description
      );

      const [healthy, , totalRounds] = await feedProxy.getHealthMetrics();
      expect(healthy).to.be.true;
      expect(totalRounds).to.equal(1);
    });

    it("Should check staleness correctly", async function () {
      expect(await feedProxy.isStale()).to.be.true;
    });
  });
});
