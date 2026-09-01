#!/bin/bash
set -e
echo "=== ReClaim Senior PM Verify ==="
echo "[1/4] Contracts compile..."
cd contracts && npx hardhat compile
echo "[2/4] Contracts test (34 tests)..."
npx hardhat test
echo "[3/4] Integration test..."
npx hardhat run scripts/integration-test.js --network hardhat
cd ..
echo "[4/4] Frontend build..."
cd frontend && rm -rf .next && npm run build
echo ""
echo "✅ ALL BUILDS PASS — Ready to compete"
