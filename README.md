# ReClaim — Trash-to-Token Protocol
### Turning Physical Waste into On-Chain Value

> **Hackathon:** Web3 Unsolved Challenges Hackathon 2026  
> **Track:** Real-World Impact / Sustainability / DePIN + AI  
> **Team:** ReClaim (1-4 members)  
> **Status:** Working MVP. Scan, classify, pin, and mint run end to end on Base Sepolia.

![License: MIT](https://img.shields.io/badge/License-MIT-green)
![Network: Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-blue)
![Stack: Solidity + Next.js + AI](https://img.shields.io/badge/Stack-Solidity%20%7C%20Next.js%20%7C%20AI-orange)

---

## 1. Problem Statement

**Unsolved Challenge:** Web3 has no trustless way to verify real-world physical actions. Recycling is unverifiable — anyone can claim they recycled, no one can prove it. Result:

- $280B lost annually to failed recycling systems (World Bank, 2024)
- Greenwashing: corporations fake ESG data with no audit
- Citizens have zero incentive to recycle — no reward, no reputation
- The "Oracle Problem" for physical waste: how to bring off-chain trash verification on-chain without a centralized authority?

Existing solutions are centralized databases (RecycleBank, etc.) or manual audits. No decentralized, verifiable, rewarding layer exists.

**Who it affects:** 8B people, municipalities, brands with ESG mandates, carbon credit markets.

## 2. Solution — ReClaim

**ReClaim = Phone Camera -> On-device AI -> IPFS -> On-Chain Mint -> Token Reward**

1. User scans trash with their phone camera (or uploads a photo)
2. **On-device** TensorFlow.js MobileNet v2 classifies the frame. ImageNet classes are mapped onto six waste materials (PET, HDPE, Aluminum, Glass, E-Waste, Organic) by a curated label map in `frontend/lib/classify.ts`
3. If nothing maps, or model confidence is under 85%, **the app refuses to proceed**. There is no path to a receipt for an image the classifier cannot substantiate
4. The exact JPEG bytes are pinned to IPFS and hashed with `keccak256`. Anyone can fetch the CID and recompute the hash to verify the receipt
5. `submitProof(material, confidence, cid, imageHash)` on Base Sepolia mints a **Receipt NFT (ERC-721)** plus material-weighted **$RECLAIM (ERC-20)**
6. 10% of receipts are audit-flagged. Staked auditors bond 50 $RECLAIM to challenge one; a correct challenge burns the receipt and claws the reward back, a wrong one forfeits the bond

**Unique Value:**
- **Proof-of-Recycling, not proof-of-work.** The scarce thing being proven is a diverted physical object
- **Anti-gaming in the contract, not the pitch:** on-chain duplicate-hash registry, an 85% confidence floor enforced in Solidity, and auditor bonds with real slashing
- **Verifiable audit selection.** Flagging is `uint256(imageHash) % 100 < 10`, a pure function anyone can recompute. No oracle to trust
- **DePIN-aligned:** every phone becomes a waste oracle, with no smart-bin hardware
- **Novel economics:** material-weighted rewards (Aluminum 5x Plastic) track real recycling value

## 3. Demo

- **Live Demo:** `https://reclaim-protocol.vercel.app` (deploy after hackathon)
- **Video:** `docs/demo-video-link.md` (1-2 min pitch + screen capture)
- **Testnet:** Base Sepolia. Addresses are written to `contracts/deployments.json` by the deploy script
- **GitHub:** `https://github.com/dgexplores/reclaim-protocol`
- **Quick Start:** See [Demo Guide](docs/DEMO_GUIDE.md)

```bash
git clone https://github.com/dgexplores/reclaim-protocol
cd reclaim-protocol
npm install
# contracts
cd contracts && npx hardhat test
# frontend
cd ../frontend && npm run dev
```

## 4. Technology Stack

| Layer | Tech |
|-------|------|
| **Blockchain** | Base Sepolia (EVM L2), Solidity 0.8.24, OpenZeppelin |
| **Tokens** | ERC-721 Receipt NFT + ERC-20 $RECLAIM, minted only by the ReClaim contract |
| **Storage** | IPFS via Lighthouse, pinned server-side; `keccak256` of the pinned bytes stored on-chain |
| **AI** | TensorFlow.js MobileNet v2, stock ImageNet weights, run in the browser. Curated ImageNet-class to material map |
| **Audit selection** | Deterministic and publicly recomputable from the image hash. No external oracle |
| **Frontend** | Next.js 14 (App Router), TypeScript, TailwindCSS, wagmi + viem, injected wallet connector |
| **Verification** | On-chain hash registry blocks double-claims; auditor bonds are slashed on a wrong challenge |

### What is real, and what is not

Judges should not have to grep for this, so here it is plainly.

| Claim | Status |
|---|---|
| On-device classification | **Real.** MobileNet v2 runs in your browser. No network call, no server inference |
| Fine-tuned waste model | **Not built.** We use stock ImageNet weights plus a curated label map. A fine-tune on TrashNet is future scope, and the accuracy of the current map is bounded by what ImageNet already knows |
| Image hash | **Real.** `keccak256` over the exact bytes pinned to IPFS |
| IPFS pinning | **Real** when `LIGHTHOUSE_API_KEY` is set. Without it the app says so and refuses to mint, rather than inventing a CID |
| On-chain mint | **Real.** A tx hash only exists if Base Sepolia produced one |
| Duplicate rejection, confidence floor | **Real,** enforced in Solidity and covered by tests |
| Auditor staking and slashing | **Real.** Bonds lock, wrong challenges forfeit, fraudulent receipts get burned and the reward clawed back |
| Chainlink VRF | **Not used.** Audit selection is deterministic on the image hash. This is weaker than VRF against a submitter who grinds hashes offline, and is marked as such in the contract |
| Challenge adjudication | **Owner-only in this MVP,** flagged in the contract as a placeholder for a token-weighted vote |
| GPS clustering | **Not implemented.** Removed from our claims rather than left as vapour |

## 5. Repository Structure

```
reclaim-protocol/
├── contracts/          # Solidity contracts + Hardhat
│   ├── contracts/
│   │   ├── ReClaim.sol          # Main protocol
│   │   ├── ReClaimToken.sol     # ERC-20 rewards
│   │   └── ReceiptNFT.sol       # ERC-721 receipts
│   └── scripts/deploy.js
├── frontend/           # Next.js 14 app
│   ├── app/            # page.tsx, api/ipfs (server-side pinning)
│   └── lib/            # classify.ts (MobileNet), proof.ts (hash + pin), wagmi.ts
├── docs/
│   ├── PROBLEM_STATEMENT.md
│   ├── SOLUTION.md
│   ├── ARCHITECTURE.md
│   ├── PITCH_DECK.md
│   └── DEMO_GUIDE.md
└── README.md
```

## 6. Submission Checklist (per Requirements)

- [x] Problem Statement, `docs/PROBLEM_STATEMENT.md`
- [x] Solution, `docs/SOLUTION.md` (**needs a factual correction pass, see section 9.2**)
- [x] Prototype/MVP, `contracts/` (34 tests passing) + `frontend/` (builds, runs)
- [x] Technology Stack, this README and `docs/ARCHITECTURE.md` (**architecture doc needs the same pass**)
- [x] GitHub Repository, this repo with setup instructions
- [ ] Live testnet deployment, blocked on a funded key, see section 9.2 step 4
- [ ] Demo video, not yet recorded
- [x] Presentation, `docs/PITCH_DECK.md` (**needs the same pass**)

## 7. Setup & Usage

### Prerequisites
- Node 18+, Git, MetaMask (Base Sepolia)

### Install
```bash
npm install
cd contracts && npm install
cd ../frontend && npm install
```

### Run Contracts Tests
```bash
cd contracts
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network baseSepolia
```

### Run Frontend
```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_CONTRACT_ADDRESS to the address the deploy script printed.
# Set LIGHTHOUSE_API_KEY (server-side, no NEXT_PUBLIC_ prefix) to enable pinning.
npm run dev # http://localhost:3000
```

## 8. AI Use Disclosure

- **In the product:** TensorFlow.js MobileNet v2 (stock ImageNet weights) runs on-device to classify waste. We wrote the ImageNet-class to material map by hand; we did not train or fine-tune a model
- **In development:** AI assistance was used for contract scaffolding review and UI component generation
- All core protocol logic (reward math, duplicate registry, bonding and slashing) is human-designed and reviewed
- We can explain every contract function and every threshold

## 9. Current State and Remaining Work

Last updated 2026-08-31. This section is the handoff. It is deliberately blunt so
work can resume cold, by a person or an agent, without re-deriving anything.

### 9.1 What changed in this pass

The repo previously described a working protocol while every demonstrable step was
simulated. `Math.random()` produced the "AI" classification, `crypto.getRandomValues`
produced a fake transaction hash that never touched a chain, the IPFS CID was a random
string, and the "recent proofs on Base Sepolia" panel was hardcoded. That gap, not a
shortage of features, was the main risk. This pass replaced the simulations with the
real pipeline.

Completed and verified:

- **Contracts.** Auditor staking, challenge bonding, and slashing now do something.
  Previously `slash()` burned the NFT and left the stake and the minted reward untouched,
  so staking was decorative. Now a bond locks on challenge, a correct challenge burns the
  receipt and claws the reward back via `ReClaimToken.burnFrom`, and a wrong challenge
  forfeits the bond into `slashPool`. `withdrawStake` can no longer pull a locked bond.
- **Audit selection.** The Chainlink VRF claim was a code comment, not code. Replaced with
  `auditFlagged(imageHash)`, a pure function anyone can recompute off-chain. Weaker than
  VRF against offline hash grinding, and labelled as such in the contract.
- **Tests.** 27 passing before, **34 passing now**, including the economics that previously
  did nothing: clawback, bond forfeiture, locked-stake withdrawal, and off-chain recompute
  of the audit flag. Run `cd contracts && npx hardhat test`.
- **Classifier.** Real TensorFlow.js MobileNet v2 running on device, in `lib/classify.ts`,
  with a curated ImageNet-class to material map. It returns a refusal, not a guess, when
  nothing maps or confidence is under 85%.
- **Proof integrity.** `keccak256` over the exact JPEG bytes that get pinned, so a verifier
  can fetch the CID and recompute the hash.
- **Security fix.** IPFS pinning moved to `app/api/ipfs/route.ts`. The key was previously
  read as `NEXT_PUBLIC_LIGHTHOUSE_KEY`, which ships it to every browser that loads the page.
  It is now `LIGHTHOUSE_API_KEY`, server-side only.
- **Chain writes.** Real `wagmi` `submitProof` with `waitForTransactionReceipt`. A tx hash
  now exists only if Base Sepolia produced one.
- **Live panel.** Reads real `ProofSubmitted` logs. The fabricated 2,847 receipts / 41.2 kg
  / 92.4% confidence figures are gone; the remaining tiles derive from actual events.
- **Cleanup.** Deleted dead `components/Scanner.tsx` (duplicate of the page, still shipping
  `alert()`) and the unused `lib/ipfs.ts`. Dropped the unused RainbowKit dependency.
- **Bundle.** First load 202 kB, down from 535 kB, by lazy-loading TensorFlow.

### 9.2 Remaining work, in priority order

**1. Fix the hydration mismatch. Pre-existing, roughly 10 minutes.**

`Math.random()` and `new Date()` are called directly inside JSX, so the server HTML and the
client render disagree and React throws on every page load. Offending lines in
`frontend/app/page.tsx`:

- line 252, `new Date().getFullYear()`
- line 330, `new Date().toLocaleDateString("en-GB")`
- line 331, `Math.floor(Math.random()*9000)` for the invoice number
- line 369, `new Date().toLocaleTimeString()`

Fix by moving each into `useState` seeded in a `useEffect`, or render a stable placeholder
until mounted. The invoice number should be derived from the receipt tokenId once a real
one exists, rather than being random at all.

**2. Verify the classifier actually loads. Blocking, do this first after the fix above.**

The Content-Security-Policy in `next.config.js` was blocking `tfhub.dev`, where the
MobileNet weights are hosted, so the model never loaded and the page showed its honest
"could not load the on-device classifier" error. `connect-src` has been widened to allow
`tfhub.dev` and `storage.googleapis.com`, but **this has not been re-tested**. Until a real
photo has been classified successfully, treat the end-to-end claim as written but unproven.

To verify: `npm run dev --prefix frontend`, open the page, wait for the scan button to stop
saying "Loading classifier", then upload a photo of a plastic bottle, an aluminium can, or a
banana. Expect a material, a confidence figure, and the raw ImageNet class it matched.
Expect a refusal on a photo of something that is not waste. Both outcomes are correct
behaviour and worth showing a judge.

**3. Correct the remaining docs. Roughly 40 minutes, highest credibility risk.**

The README is now accurate. These nine files still carry the original overclaims, and a
judge who reads them will find the same "98% accuracy", "TrashNet", "custom 12k dataset",
"Chainlink VRF", and "RainbowKit" statements that the code does not support:

`docs/PITCH_DECK.md`, `docs/ARCHITECTURE.md`, `docs/SOLUTION.md`, `docs/TEST_REPORT.md`,
`docs/SECURITY.md`, `docs/SUBMISSION.md`, `docs/DEMO_GUIDE.md`, `PRODUCT.md`,
`frontend/PRODUCT.md`.

Use the "What is real, and what is not" table in section 4 as the source of truth. Also fix
`docs/TEST_REPORT.md`, which reports the old 27-test run and a gas figure below 250k;
`submitProof` now costs about 253.6k because of the clawback bookkeeping, which is still far
under a cent on Base.

**4. Deploy to Base Sepolia. Requires a funded key, so this one is yours to run.**

```bash
cd contracts
cp .env.example .env          # set PRIVATE_KEY and BASE_SEPOLIA_RPC
npx hardhat run scripts/deploy.js --network baseSepolia
```

The script writes `contracts/deployments.json`, asserts the minter wiring actually took
effect rather than shipping a half-wired deployment, and prints both the
`NEXT_PUBLIC_CONTRACT_ADDRESS` line and the `hardhat verify` command. Then:

```bash
cd frontend
cp .env.example .env.local    # set NEXT_PUBLIC_CONTRACT_ADDRESS and LIGHTHOUSE_API_KEY
```

Without a contract address the app still runs and says so plainly instead of faking a mint.
Without a Lighthouse key it refuses to pin rather than inventing a CID.

**5. Optional, only after 1 to 4 are done.**

GPS clustering as an anti-gaming signal is currently claimed nowhere and implemented
nowhere, which is consistent. If you want it back as a differentiator, it needs a
`bytes8 geohash` parameter on `submitProof`, a per-geohash daily cap, and updates to every
test. Do not re-add the claim to the docs without the code.

### 9.3 Known limitations worth stating out loud to a judge

- The classifier is stock ImageNet, not a waste-trained model, so its accuracy on real
  trash is bounded by what ImageNet already knows. It refuses rather than guesses, which is
  the right failure mode for a proof system, but it will refuse things a fine-tuned model
  would accept.
- Audit flagging is deterministic on the image hash, so a determined submitter could grind
  hashes offline to avoid being flagged. Chainlink VRF is the upgrade path.
- Challenge adjudication is owner-only, a placeholder for a token-weighted vote.
- Rate limiting in `middleware.ts` is per-isolate in-memory, so it resets on cold start.
  Fine for a demo, needs Upstash Redis or similar for real traffic.

## 10. Future Scope

- Partner with municipalities for bin-mounted QR verification
- Carbon credit bridge (Verra VCS integration)
- Mobile app (React Native + native TFLite)
- DAO-governed material reward weights

## 11. Team & Credits

- Built for Web3 Unsolved Challenges Hackathon 2026
- Open source (MIT), publicly viewable
- APIs and libraries: Lighthouse IPFS, TensorFlow.js, MobileNet v2, OpenZeppelin, wagmi/viem
- No third-party dataset was used. The classifier runs stock ImageNet weights

---
**Contact:** reclaim-protocol@hackathon.xyz | GitHub Issues for Q&A
