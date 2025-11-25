import { expect } from "chai";
import { ethers } from "hardhat";
import { PriceFeedReactor } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PriceFeedReactor", function () {
  let reactor: PriceFeedReactor;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  const originChainId = 11155111;
  const mockOriginContract = "0x1234567890123456789012345678901234567890";

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    const PriceFeedReactorFactory = await ethers.getContractFactory("PriceFeedReactor");
    reactor = await PriceFeedReactorFactory.deploy();
    await reactor.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await reactor.owner()).to.equal(owner.address);
    });

    it("Should initialize temporal state", async function () {
      const state = await reactor.getTemporalState();
      expect(state.healingAttempts).to.equal(0);
      expect(state.cumulativeDrift).to.equal(0);
    });

    it("Should have zero subscriptions initially", async function () {
      expect(await reactor.subscriptionCount()).to.equal(0);
    });
  });

  describe("Subscriptions", function () {
    it("Should allow owner to create subscription", async function () {
      const eventSig = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
      
      await expect(
        reactor.subscribe(originChainId, mockOriginContract, eventSig)
      ).to.emit(reactor, "SubscriptionCreated");
    });

    it("Should increment subscription count", async function () {
      const eventSig = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
      
      await reactor.subscribe(originChainId, mockOriginContract, eventSig);
      expect(await reactor.subscriptionCount()).to.equal(1);
    });

    it("Should store subscription correctly", async function () {
      const eventSig = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
      
      await reactor.subscribe(originChainId, mockOriginContract, eventSig);
      
      const sub = await reactor.subscriptions(0);
      expect(sub.originChainId).to.equal(originChainId);
      expect(sub.originContract).to.equal(mockOriginContract);
      expect(sub.active).to.be.true;
    });

    it("Should not allow non-owner to create subscription", async function () {
      const eventSig = ethers.id("PriceUpdateEmitted(uint80,int256,uint256,uint8,string,bytes32,uint256)");
      
      await expect(
        reactor.connect(addr1).subscribe(originChainId, mockOriginContract, eventSig)
      ).to.be.reverted;
    });
  });

  describe("Destination Configuration", function () {
    it("Should allow owner to set destination", async function () {
      const destChainId = 84532;
      const destContract = "0x9876543210987654321098765432109876543210";
      
      await reactor.setDestination(destChainId, destContract);
      
      expect(await reactor.destinationChainId()).to.equal(destChainId);
      expect(await reactor.destinationContract()).to.equal(destContract);
    });

    it("Should reject zero address for destination", async function () {
      const destChainId = 84532;
      
      await expect(
        reactor.setDestination(destChainId, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid destination");
    });

    it("Should not allow non-owner to set destination", async function () {
      const destChainId = 84532;
      const destContract = "0x9876543210987654321098765432109876543210";
      
      await expect(
        reactor.connect(addr1).setDestination(destChainId, destContract)
      ).to.be.reverted;
    });
  });

  describe("Constants", function () {
    it("Should have correct confidence thresholds", async function () {
      expect(await reactor.MAX_CONFIDENCE_THRESHOLD()).to.equal(8000);
      expect(await reactor.MIN_CONFIDENCE_THRESHOLD()).to.equal(5000);
    });

    it("Should have correct max relay attempts", async function () {
      expect(await reactor.MAX_RELAY_ATTEMPTS()).to.equal(3);
    });

    it("Should have correct drift healing threshold", async function () {
      expect(await reactor.DRIFT_HEALING_THRESHOLD()).to.equal(5000);
    });
  });

  describe("Temporal State", function () {
    it("Should track temporal state correctly", async function () {
      const state = await reactor.getTemporalState();
      
      expect(state.healingAttempts).to.equal(0);
      expect(state.cumulativeDrift).to.equal(0);
      expect(state.lastOriginUpdate).to.be.greaterThan(0);
      expect(state.lastDestinationRelay).to.be.greaterThan(0);
    });
  });
});
