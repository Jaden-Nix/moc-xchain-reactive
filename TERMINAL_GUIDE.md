# Terminal Feature Guide

Your dashboard now includes an interactive terminal that allows you to run npm and hardhat commands directly from the UI.

## Using the Terminal

1. Click the "▶ Open Terminal" button in the dashboard footer
2. Type any allowed command in the input field at the bottom
3. Press Enter to execute
4. Use arrow keys to navigate through command history

## Available Commands

- `npm run test` - Run tests
- `npm run compile` - Compile Solidity contracts
- `npm run lint` - Lint Solidity files
- `npm run format` - Format code
- `hardhat compile` - Compile with Hardhat
- `hardhat test` - Run Hardhat tests
- `npm list` - List installed packages
- `node --version` - Check Node version
- `npm --version` - Check npm version

## Quick Tips

- Terminal history: Use UP/DOWN arrow keys to cycle through previous commands
- Clear: Click the "Clear" button to clear terminal output
- Full coverage: Works locally in development AND on Vercel deployment
