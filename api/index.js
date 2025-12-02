const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 5000;

// Chainlink feed addresses on Sepolia
const CHAINLINK_FEEDS = {
  'ETH/USD': '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  'BTC/USD': '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
  'LINK/USD': '0xc59E3633BAAC79493d908e63626716e204A45EdF',
};

const AGGREGATOR_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
];

const RPC_ENDPOINTS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.org',
  'https://sepolia.drpc.org',
  'https://1rpc.io/sepolia',
];

let currentRpcIndex = 0;

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_ENDPOINTS[currentRpcIndex], 11155111, { staticNetwork: true });
}

function rotateRpc() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  return getProvider();
}

app.use(cors());
app.use(express.json());

const distPath = path.join(__dirname, '..', 'dist');
const presentationPath = path.join(__dirname, '..', 'presentation');

app.use(express.static(distPath));
app.use('/presentation', express.static(presentationPath));

// Serve slides directly
app.get('/slides', (req, res) => {
  res.sendFile(path.join(presentationPath, 'slides.html'));
});

// List of allowed commands for security
const ALLOWED_COMMANDS = [
  'npm run test',
  'npm run compile',
  'npm run lint',
  'npm run format',
  'npx hardhat compile',
  'npx hardhat test',
  'npx hardhat run',
  'npm list',
  'node --version',
  'npm --version',
];

function isCommandAllowed(command) {
  return ALLOWED_COMMANDS.some((allowed) => command.trim().startsWith(allowed));
}

// Run arbitrary command and stream output
app.post('/api/run-command', (req, res) => {
  const { command } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Command is required' });
  }

  if (!isCommandAllowed(command.trim())) {
    return res.status(403).json({
      error: `Command not allowed. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`,
    });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const childProcess = exec(command, { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 10 });

  if (childProcess.stdout) {
    childProcess.stdout.on('data', (data) => {
      res.write(data);
    });
  }

  if (childProcess.stderr) {
    childProcess.stderr.on('data', (data) => {
      res.write(`${data}`);
    });
  }

  childProcess.on('close', (code) => {
    res.write(`\n[Process exited with code ${code}]\n`);
    res.end();
  });

  childProcess.on('error', (error) => {
    res.write(`\n[Error] ${error.message}\n`);
    res.end();
  });

  const timeout = setTimeout(() => {
    if (!res.writableEnded) {
      res.write('\n[Timeout] Command execution timed out after 5 minutes\n');
      res.end();
      childProcess.kill();
    }
  }, 300000);

  res.on('close', () => {
    clearTimeout(timeout);
    childProcess.kill();
  });
});

// Legacy endpoint for tests
app.post('/api/run-test', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const childProcess = exec('npm run test', { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 10 });

  if (childProcess.stdout) {
    childProcess.stdout.on('data', (data) => {
      res.write(data);
    });
  }

  if (childProcess.stderr) {
    childProcess.stderr.on('data', (data) => {
      res.write(`${data}`);
    });
  }

  childProcess.on('close', (code) => {
    res.write(`\n[Process exited with code ${code}]\n`);
    res.end();
  });

  childProcess.on('error', (error) => {
    res.write(`\n[Error] ${error.message}\n`);
    res.end();
  });

  const timeout = setTimeout(() => {
    if (!res.writableEnded) {
      res.write('\n[Timeout] Test execution timed out after 5 minutes\n');
      res.end();
      childProcess.kill();
    }
  }, 300000);

  res.on('close', () => {
    clearTimeout(timeout);
    childProcess.kill();
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Fetch Chainlink prices from backend (avoids CORS issues)
app.get('/api/chainlink-prices', async (req, res) => {
  const results = [];
  
  for (const [pair, address] of Object.entries(CHAINLINK_FEEDS)) {
    for (let attempt = 0; attempt < RPC_ENDPOINTS.length; attempt++) {
      try {
        const provider = attempt === 0 ? getProvider() : rotateRpc();
        const contract = new ethers.Contract(address, AGGREGATOR_ABI, provider);
        
        const [roundData, decimals] = await Promise.all([
          contract.latestRoundData(),
          contract.decimals(),
        ]);
        
        // Safely convert BigInt to Number
        const rawPrice = roundData[1];
        const rawDecimals = Number(decimals);
        const price = Number(rawPrice) / Math.pow(10, rawDecimals);
        const updatedAtTimestamp = Number(roundData[3]);
        const roundId = roundData[0].toString();
        
        results.push({
          feed: address,
          pair,
          price,
          priceFormatted: `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          roundId,
          updatedAt: new Date(updatedAtTimestamp * 1000).toISOString(),
          updatedAtTimestamp,
          decimals: rawDecimals,
          isReal: true,
          source: 'chainlink',
        });
        break;
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed for ${pair}:`, error.message);
        if (attempt === RPC_ENDPOINTS.length - 1) {
          console.error(`All attempts failed for ${pair}`);
        }
      }
    }
  }
  
  res.json({ success: true, prices: results, timestamp: Date.now() });
});

// Fetch historical price data
app.get('/api/chainlink-history/:pair', async (req, res) => {
  const { pair } = req.params;
  const numRounds = parseInt(req.query.rounds) || 10;
  const address = CHAINLINK_FEEDS[pair];
  
  if (!address) {
    return res.status(404).json({ error: 'Feed not found' });
  }
  
  const history = [];
  
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(address, AGGREGATOR_ABI, provider);
    
    const latestData = await contract.latestRoundData();
    const latestRoundId = BigInt(latestData[0].toString());
    const rawDecimals = Number(await contract.decimals());
    
    const phaseId = latestRoundId >> 64n;
    const aggregatorRoundId = latestRoundId & ((1n << 64n) - 1n);
    
    // First add the latest price
    const latestPrice = Number(latestData[1]) / Math.pow(10, rawDecimals);
    const latestTimestamp = Number(latestData[3]) * 1000;
    
    if (latestPrice > 0) {
      history.push({
        timestamp: latestTimestamp,
        price: latestPrice,
        feed: pair,
      });
    }
    
    // Try to get historical rounds (may fail due to phase boundaries)
    for (let i = 1; i < numRounds && aggregatorRoundId - BigInt(i) > 0n; i++) {
      try {
        const roundToQuery = (phaseId << 64n) | (aggregatorRoundId - BigInt(i));
        const roundData = await contract.getRoundData(roundToQuery);
        
        const histPrice = Number(roundData[1]) / Math.pow(10, rawDecimals);
        const histTimestamp = Number(roundData[3]) * 1000;
        
        if (histPrice > 0 && histTimestamp > 0) {
          history.push({
            timestamp: histTimestamp,
            price: histPrice,
            feed: pair,
          });
        }
      } catch {
        // Skip rounds that fail (likely phase boundary)
        continue;
      }
    }
    
    res.json({ success: true, history: history.reverse(), pair });
  } catch (error) {
    console.error(`Failed to get history for ${pair}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Attack simulation endpoint - returns structured JSON for Security Event Log
app.post('/api/attack-simulation', (req, res) => {
  const events = [];
  let output = '';
  
  const childProcess = exec(
    'npx hardhat run scripts/test/simulate_attack.js --network hardhat',
    { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 10 }
  );

  if (childProcess.stdout) {
    childProcess.stdout.on('data', (data) => {
      output += data;
    });
  }

  if (childProcess.stderr) {
    childProcess.stderr.on('data', (data) => {
      output += data;
    });
  }

  childProcess.on('close', (code) => {
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    
    // Parse the output and create structured events
    if (output.includes('THE BLACK HOLE')) {
      events.push({
        id: Date.now() + 1,
        timestamp,
        type: 'Zero Price Injection',
        details: 'Attempted $0 price update',
        status: output.includes('ATTACK 1') && output.includes('REJECTED') ? 'blocked' : 'failed',
        reason: 'InvalidAnswer()'
      });
    }
    
    if (output.includes('THE NEGATOR')) {
      events.push({
        id: Date.now() + 2,
        timestamp,
        type: 'Negative Price',
        details: 'Attempted -$500 injection',
        status: output.includes('ATTACK 2') && output.includes('REJECTED') ? 'blocked' : 'failed',
        reason: 'InvalidAnswer()'
      });
    }
    
    if (output.includes('THE FLASH CRASH')) {
      events.push({
        id: Date.now() + 3,
        timestamp,
        type: 'Flash Crash',
        details: '99% deviation detected ($2000→$20)',
        status: output.includes('ATTACK 3') && output.includes('REJECTED') ? 'blocked' : 'failed',
        reason: 'DeviationTooHigh()'
      });
    }
    
    if (output.includes('THE ZOMBIE')) {
      events.push({
        id: Date.now() + 4,
        timestamp,
        type: 'Replay Attack',
        details: 'Stale roundId: 50 (already processed)',
        status: output.includes('ATTACK 4') && output.includes('REJECTED') ? 'blocked' : 'failed',
        reason: 'InvalidRoundId()'
      });
    }

    const attacksBlocked = events.filter(e => e.status === 'blocked').length;
    
    res.json({
      success: code === 0,
      events,
      summary: {
        total: events.length,
        blocked: attacksBlocked,
        passed: 0
      },
      rawOutput: output
    });
  });

  childProcess.on('error', (error) => {
    res.status(500).json({ error: error.message });
  });

  const timeout = setTimeout(() => {
    childProcess.kill();
    res.status(504).json({ error: 'Attack simulation timed out' });
  }, 120000);

  res.on('close', () => {
    clearTimeout(timeout);
  });
});

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
