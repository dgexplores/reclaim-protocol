# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Next.js 14 (App Router, TypeScript), TailwindCSS, viem/wagmi, Solidity 0.8.24 (Hardhat), Base Sepolia

## Users
Primary: hackathon judges + Web3-curious citizens 18-35, scanning household waste with phone camera during demo / pilot on campus. Secondary: city sustainability leads and brand ESG managers evaluating verifiable recycling primitives. Job: prove a physical recycling action on-chain in <10s and earn redeemable value.

## Product Purpose
ReClaim proves real-world recycling without hardware. Phone camera + on-device AI classifies material, hashes + IPFS pins the proof, Base L2 mints a Receipt NFT + material-weighted $RECLAIM. Success = judge scans real trash live, sees confidence, gets tx hash and NFT in under 10s, believes this solves the physical oracle problem for waste.

## Positioning
Phone-as-oracle DePIN for waste. No smart bins ($500 each), no manual audit. First Proof-of-Recycling with anti-gaming quartet: image-hash dedup, confidence threshold, GPS clustering, staked auditor lottery via VRF. Every phone becomes a validator. A database clone cannot copy the on-chain receipt composability (reputation, governance, DeFi).

## Operating Context
Used on mobile browser, often in daylight/kitchen/campus, one-handed. Needs camera permission (secure context), file fallback. Evaluated on testnet with faucet, scanned via BaseScan. Compared against RecycleBank, manual audits, NFT eco-art. Winning requires demonstrable verification, not claims.

## Capabilities and Constraints
- Must: camera scan → classify 6 materials (PET/HDPE/Aluminum/Glass/E-Waste/Organic) 88-98% confidence, IPFS CID, image hash, submitProof(uint8, uint8, string, bytes32) on Base Sepolia, mint NFT+ERC20, show tx.
- Must: duplicate hash revert, low confidence (<85) revert, invalid material revert, zero-address checks, auditor staking.
- Stack constraint: keep gas <250k (~$0.01), IPFS via Lighthouse, TensorFlow.js mock acceptable for MVP with swap to real model.
- Terminology: material, confidence, CID, imageHash, Receipt NFT, $RECLAIM.
- Undecided: final reward weights (governance), mainnet chain, native app vs PWA.

## Brand Commitments
Name: ReClaim Protocol. Voice: precise, physical, optimistic — waste as resource. No existing logo, no palette locked; new world should feel tactile (trash texture, craft), not AI slop. Must not look generic. Emil Kowalski influence approved: polished micro-interactions, physics, intent.

## Evidence on Hand
- Working contracts: ReClaim.sol, ReClaimToken.sol, ReceiptNFT.sol, 27 tests passing, integration script, deploy script verified on Base Sepolia.
- Frontend: Next.js build 89kB, Scanner component (mock classify), BaseScan link.
- Docs: PROBLEM_STATEMENT, SOLUTION, ARCHITECTURE (mermaid), PITCH_DECK 10 slides, DEMO_GUIDE, SECURITY checklist, TEST_REPORT.
- No real user data; all demo synthetic, must label as such.

## Product Principles
1. Prove, don't claim — show confidence, hash, CID, tx, not slogans.
2. One tap to proof — scanning beats dashboards.
3. Physical weight dictates value — aluminum ≠ plastic.
4. Trustless by construction — dedup + staking > centralized audit.
5. Delight in the mundane — trash deserves craft.

## Accessibility & Inclusion
Mobile-first, low-light tolerant, file fallback for camera denial, keyboard navigable scanner controls, confidence announced, no private data leaves device before hash (privacy-preserving).
