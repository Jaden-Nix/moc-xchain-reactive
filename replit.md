# MOC Reactive Oracle Project

## Project Overview
Mirror-of-Chainlink (MOC) - A production-grade cross-chain oracle mirroring system using Reactive Contracts with novel Temporal Drift Guards and Predictive Confidence Scoring.

## Recent Changes
- November 25, 2025: Initial project creation
  - Complete smart contract implementation (Origin, Reactive, Destination)
  - Deployment scripts for all three chains
  - Comprehensive test suite
  - Full documentation (Architecture, Security, Video Script)
  - Workflow configurations and execution runbook

## Architecture
- **Origin Chain (Sepolia)**: OriginFeedRelay monitors Chainlink feeds
- **Reactive Network**: PriceFeedReactor orchestrates cross-chain relay
- **Destination Chain (Base Sepolia)**: DestinationFeedProxy provides Chainlink-compatible interface

## Key Technologies
- Solidity 0.8.20
- Hardhat
- Ethers.js v6
- Chainlink Contracts
- OpenZeppelin Contracts
- TypeScript

## Project Status
Development phase - testnet deployment ready
