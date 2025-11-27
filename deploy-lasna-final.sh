#!/bin/bash
set -e

echo ""
echo "🚀 DEPLOYING TO LASNA"
echo "=================================================="
echo ""

MOCK_FEED="0xE293955c98D37044400E71c445062d7cd967250c"
ORIGIN_RELAY="0x46ad513300d508FB234fefD3ec1aB4162C547A57"

echo "Origin Contracts (Sepolia):"
echo "  MockPriceFeed:  $MOCK_FEED"
echo "  OriginRelay:    $ORIGIN_RELAY"
echo ""

export MOCK_FEED_ADDR="$MOCK_FEED"
export ORIGIN_RELAY_ADDR="$ORIGIN_RELAY"

npx hardhat run scripts/deploy/02_deploy_reactive_lasna.ts --network lasna

echo ""
echo "✅ DEPLOYMENT COMPLETE"
echo ""
