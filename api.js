const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// Run tests and stream output
app.post('/api/run-test', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const childProcess = exec('npm run test', { cwd: process.cwd() });

  if (childProcess.stdout) {
    childProcess.stdout.on('data', (data) => {
      res.write(data);
    });
  }

  if (childProcess.stderr) {
    childProcess.stderr.on('data', (data) => {
      res.write(`[stderr] ${data}`);
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
      res.write('\n[Timeout] Test execution timed out\n');
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});
