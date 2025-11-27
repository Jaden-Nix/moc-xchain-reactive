# Vercel Deployment Guide

## Environment Variables Required

✅ **GOOD NEWS**: No environment variables needed! Your dashboard uses:
- Public RPC endpoints (Sepolia & Lasna testnets)
- Hardcoded contract addresses
- MetaMask for wallet connections

## Deployment Steps

### Option 1: Using Vercel CLI

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel

# 4. Choose your project settings during prompt
```

### Option 2: Connect GitHub Repository

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Select your repository
4. Vercel will auto-detect the configuration
5. Click "Deploy"

## What Gets Deployed

- **Frontend**: React dashboard (built to `dist/`)
- **Backend**: Node.js API server for running tests
- **Terminal Feature**: Works on Vercel (runs `npm test` on your server)

## URL After Deployment

Your dashboard will be available at: `https://your-project.vercel.app`

## Features Available on Vercel

✅ Read contract data from testnets (no wallet needed)
✅ Connect MetaMask for write operations
✅ Terminal viewer with test execution
✅ Cross-chain price relay visualization

## Important Notes

1. **Test Execution**: The terminal feature runs `npm test` on Vercel's servers. Since contracts compile from source, tests will run but may take longer than locally.

2. **MetaMask**: Users visiting your dashboard will use their own MetaMask for wallet operations - completely secure.

3. **RPC Endpoints**: Public endpoints (rpc.sepolia.org, lasna-rpc.rnk.dev) are rate-limited. For production, consider using a service like:
   - Alchemy
   - Infura
   - QuickNode
   Then add their API keys as environment variables if needed.

## Troubleshooting

If deployment fails:
1. Check `vercel.json` is in root directory
2. Ensure `api.js` is in root directory
3. Check that all dependencies in `package.json` are available for Node.js

## Optimize for Production (Optional)

To use faster RPC endpoints, add secrets in Vercel:

```bash
vercel env add SEPOLIA_RPC_URL
vercel env add LASNA_RPC_URL
```

Then update `src/contractInteraction.ts`:
```typescript
const RPC_ENDPOINTS = {
  sepolia: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
  lasna: process.env.LASNA_RPC_URL || 'https://lasna-rpc.rnk.dev',
  // ...
}
```
