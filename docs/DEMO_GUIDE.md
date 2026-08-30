# Demo Guide — ReClaim

## Live Demo
- URL: `http://localhost:3000` (local) or `https://reclaim-protocol.vercel.app` (after deploy)
- Testnet: Base Sepolia — get faucet: https://www.alchemy.com/faucets/base-sepolia
- Contract: `0x0000000000000000000000000000000000000000` (update after deploy)

## Video (Required Submission)
Record 90-120s:
0:00-0:15 Problem (landfill stats)
0:15-0:45 Scan aluminum can → AI says "Aluminum 94%" → submit tx → show Basescan tx
0:45-1:15 Show Receipt NFT in wallet + $RECLAIM balance + IPFS CID resolve
1:15-1:30 Auditor view + redeem mock
Export 1080p, upload to YouTube unlisted + Loom, link here.

## How to Run Locally

```bash
git clone https://github.com/your-team/reclaim-protocol
cd reclaim-protocol
# contracts
cd contracts
npm install
npx hardhat compile
npx hardhat test
npx hardhat node # in separate terminal
npx hardhat run scripts/deploy.js --network localhost
# frontend
cd ../frontend
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
# NEXT_PUBLIC_CHAIN_ID=84532
# NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.lighthouse.storage/ipfs/
npm run dev
```

## How to Demo Without Real Trash
- Use `frontend/public/samples/` — 6 sample images (plastic, glass, etc.)
- Or print QR from docs/samples.pdf and scan

## What Judges Will See
- Wallet connect (RainbowKit)
- Scanner with live confidence
- On-chain tx hash + Etherscan link
- NFT metadata on OpenSea testnet
- Token balance update

## Troubleshooting
- Camera not working → use file upload fallback
- VRF not configured on localhost → lottery mocked to 0% in dev
- IPFS fail → fallback to local hash log

## Submission Links Template

- GitHub: https://github.com/your-team/reclaim-protocol
- Demo: https://reclaim-protocol.vercel.app
- Video: https://youtu.be/xxxx
- Deck: https://pitch.com/reclaim or PDF in docs/
- Contract: https://sepolia.basescan.org/address/0x...
