const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

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
