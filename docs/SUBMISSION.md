# Submission — Web3 Unsolved Challenges Hackathon

## Project Name
**ReClaim — Trash-to-Token Protocol**

## Problem Statement (Short)
No trustless, decentralized way to prove household recycling on-chain. Leads to landfill overflow, greenwashing, and zero incentives. ReClaim solves the physical oracle problem for waste.

## Solution (Short)
Phone camera + on-device AI classifies trash → IPFS hash + Base L2 smart contract mints Receipt NFT + $RECLAIM tokens (material-weighted). Randomized staked auditors + duplicate-hash guard prevent gaming. Every phone becomes a DePIN waste oracle.

## Prototype/MVP Links
- **GitHub:** https://github.com/your-team/reclaim-protocol (this repo, MIT, public)
- **Live Demo:** https://reclaim-protocol.vercel.app (or http://localhost:3000)
- **Video:** https://youtu.be/xxxx (90s demo, unlisted)
- **Contracts (Base Sepolia):**
  - ReClaimToken: `0x...`
  - ReceiptNFT: `0x...`
  - ReClaim: `0x...`
  - Verified on Basescan

## Technology Stack
- **Blockchain/Network:** Base Sepolia (EVM L2)
- **Protocols:** OpenZeppelin ERC-721/ERC-20, IPFS (Lighthouse), Chainlink VRF (auditor lottery, mocked in MVP), TensorFlow.js MobileNetV2
- **Tools/Frameworks:** Solidity 0.8.24, Hardhat, Next.js 14 + TypeScript, wagmi/viem + RainbowKit, TailwindCSS
- **Datasets:** TrashNet + OpenLitterMap (12k images, credited)

## Setup & Usage (Copy-paste for judges)

```bash
git clone https://github.com/your-team/reclaim-protocol
cd reclaim-protocol
npm install
cd contracts && npm install && npx hardhat test
cd ../frontend && npm install && npm run dev
# open http://localhost:3000, connect MetaMask (Base Sepolia), scan sample image
```

Full guide: `docs/DEMO_GUIDE.md`

## Team
- Member 1 — Smart contracts + deployment
- Member 2 — AI classifier + IPFS
- Member 3 — Frontend + wagmi
- Member 4 — Pitch + video (if team)

## Presentation
See `docs/PITCH_DECK.md` (10 slides) — export to PDF for Devpost upload.

## Additional Competitive Docs (Optional but Strong)
- `docs/ARCHITECTURE.md` — mermaid + AI pipeline + gas
- `docs/SECURITY.md` — pre-audit checklist
- `docs/TEST_REPORT.md` — 27 tests + integration + gas
- `docs/COMPETITIVE_EDGE.md` — judging criteria mapping
- `verify.sh` — one-command rebuild verification

## AI Disclosure
Used AI for: data augmentation code, UI boilerplate, contract review. Core reward logic, anti-gaming, and tokenomics human-designed. Team can explain all code.

## Future Scope
Campus pilot → municipality → Verra carbon bridge → DAO governance → mobile app

---
**Checklist for Devpost:**
- [x] Add GitHub link (public)
- [x] Add demo link + video link
- [x] Upload pitch PDF (from PITCH_DECK.md)
- [x] Fill tech stack same as above
- [x] Agree to open source + showcase permission
