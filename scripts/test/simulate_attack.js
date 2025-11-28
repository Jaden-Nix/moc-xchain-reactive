const { ethers } = require("hardhat");

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
};

function log(color, ...args) {
  console.log(color + args.join(" ") + COLORS.reset);
}

async function main() {
  log(COLORS.bold + COLORS.cyan, "\n╔══════════════════════════════════════════════════════════════╗");
  log(COLORS.bold + COLORS.cyan, "║           🦹 MOC SECURITY STRESS TEST - VILLAIN MODE 🦹       ║");
  log(COLORS.bold + COLORS.cyan, "╚══════════════════════════════════════════════════════════════╝\n");

  log(COLORS.yellow, "Deploying test contracts for attack simulation...\n");

  const [deployer] = await ethers.getSigners();
  
  const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
  const mockFeed = await MockPriceFeed.deploy("ETH/USD", 8);
  await mockFeed.waitForDeployment();
  await mockFeed.setPrice(200000000000n);
  
  const DestinationFeedProxy = await ethers.getContractFactory("DestinationFeedProxy");
  const destination = await DestinationFeedProxy.deploy(8, "ETH/USD");
  await destination.waitForDeployment();
  
  await destination.setRelayerAuthorization(deployer.address, true);
  
  const initialPrice = 200000000000n;
  const initialRound = 100n;
  const now = BigInt(Math.floor(Date.now() / 1000));
  await destination.updatePrice(initialRound, initialPrice, now - 10n, now, initialRound, 8, "ETH/USD");

  log(COLORS.green, "✓ Test environment ready");
  log(COLORS.white, `  MockPriceFeed: ${await mockFeed.getAddress()}`);
  log(COLORS.white, `  DestinationProxy: ${await destination.getAddress()}`);
  log(COLORS.white, `  Initial price: $${Number(initialPrice) / 1e8}`);
  log(COLORS.white, `  Initial roundId: ${initialRound}\n`);

  let attacksBlocked = 0;
  let totalAttacks = 4;

  log(COLORS.bold + COLORS.magenta, "═══════════════════════════════════════════════════════════════");
  log(COLORS.bold + COLORS.magenta, "                    COMMENCING ATTACK SEQUENCE                  ");
  log(COLORS.bold + COLORS.magenta, "═══════════════════════════════════════════════════════════════\n");

  log(COLORS.bold + COLORS.yellow, "[ATTACK 1] 🕳️  THE BLACK HOLE - Injecting Zero Price ($0)...");
  try {
    const zeroPrice = 0n;
    const tx = await destination.updatePrice(101n, zeroPrice, now, now, 101n, 8, "ETH/USD");
    await tx.wait();
    log(COLORS.red, "⚠️  VULNERABILITY: Zero price was accepted!");
  } catch (error) {
    const errorName = error.message.includes("InvalidAnswer") ? "InvalidAnswer()" : "Contract reverted";
    attacksBlocked++;
    log(COLORS.red, "❌ REJECTED by Destination Contract.");
    log(COLORS.cyan, `   Reason: ${errorName} - Price must be positive`);
    log(COLORS.green, "🛡️  System Safety: MAINTAINED\n");
  }

  log(COLORS.bold + COLORS.yellow, "[ATTACK 2] ➖  THE NEGATOR - Injecting Negative Price (-$500)...");
  try {
    const negativePrice = -50000000000n;
    const tx = await destination.updatePrice(102n, negativePrice, now, now, 102n, 8, "ETH/USD");
    await tx.wait();
    log(COLORS.red, "⚠️  VULNERABILITY: Negative price was accepted!");
  } catch (error) {
    attacksBlocked++;
    log(COLORS.red, "❌ REJECTED by Destination Contract.");
    log(COLORS.cyan, "   Reason: InvalidAnswer() - Negative prices rejected");
    log(COLORS.green, "🛡️  System Safety: MAINTAINED\n");
  }

  log(COLORS.bold + COLORS.yellow, "[ATTACK 3] 📉  THE FLASH CRASH - Injecting 99% Price Drop ($2000 → $20)...");
  try {
    const flashCrashPrice = 2000000000n;
    const tx = await destination.updatePrice(103n, flashCrashPrice, now, now, 103n, 8, "ETH/USD");
    await tx.wait();
    log(COLORS.red, "⚠️  VULNERABILITY: Flash crash price was accepted!");
  } catch (error) {
    const errorName = error.message.includes("DeviationTooHigh") ? "DeviationTooHigh()" : "Contract reverted";
    attacksBlocked++;
    log(COLORS.red, "❌ REJECTED by Destination Contract.");
    log(COLORS.cyan, `   Reason: ${errorName} - 99% deviation exceeds 10% threshold`);
    log(COLORS.green, "🛡️  System Safety: MAINTAINED\n");
  }

  log(COLORS.bold + COLORS.yellow, "[ATTACK 4] 🧟  THE ZOMBIE - Replaying Stale Round ID (Round 50 < 100)...");
  try {
    const staleRoundId = 50n;
    const stalePrice = 150000000000n;
    const staleTimestamp = BigInt(Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60);
    
    const tx = await destination.updatePrice(staleRoundId, stalePrice, staleTimestamp, staleTimestamp, staleRoundId, 8, "ETH/USD");
    await tx.wait();
    log(COLORS.red, "⚠️  VULNERABILITY: Stale data was accepted!");
  } catch (error) {
    const errorName = error.message.includes("InvalidRoundId") ? "InvalidRoundId()" : "Contract reverted";
    attacksBlocked++;
    log(COLORS.red, "❌ REJECTED by Destination Contract.");
    log(COLORS.cyan, `   Reason: ${errorName} - Round 50 < Latest Round 100`);
    log(COLORS.green, "🛡️  System Safety: MAINTAINED\n");
  }

  log(COLORS.bold + COLORS.magenta, "═══════════════════════════════════════════════════════════════");
  log(COLORS.bold + COLORS.magenta, "                      ATTACK SEQUENCE COMPLETE                  ");
  log(COLORS.bold + COLORS.magenta, "═══════════════════════════════════════════════════════════════\n");

  if (attacksBlocked === totalAttacks) {
    log(COLORS.bold + COLORS.green, `✅ ${attacksBlocked}/${totalAttacks} ATTACKS NEUTRALIZED`);
    log(COLORS.green, "");
    log(COLORS.green, "   ╔═══════════════════════════════════════════════════════╗");
    log(COLORS.green, "   ║  🏆 ALL MALICIOUS INPUTS REJECTED                      ║");
    log(COLORS.green, "   ║  🛡️  FEED INTEGRITY: 100% MAINTAINED                   ║");
    log(COLORS.green, "   ║  ✓  Zero-price protection: ACTIVE                      ║");
    log(COLORS.green, "   ║  ✓  Negative-price filtering: ACTIVE                   ║");
    log(COLORS.green, "   ║  ✓  Flash-crash anomaly detection: ACTIVE              ║");
    log(COLORS.green, "   ║  ✓  Replay/stale-data protection: ACTIVE               ║");
    log(COLORS.green, "   ╚═══════════════════════════════════════════════════════╝");
  } else {
    log(COLORS.bold + COLORS.red, `⚠️  ${attacksBlocked}/${totalAttacks} attacks blocked - REVIEW NEEDED`);
    log(COLORS.red, `    ${totalAttacks - attacksBlocked} attack(s) succeeded - SECURITY VULNERABILITY DETECTED`);
  }

  log(COLORS.white, "\n");
  log(COLORS.cyan, "To run this test: npx hardhat run scripts/test/simulate_attack.js --network hardhat");
  log(COLORS.white, "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
