# ReClaim — Trash-to-Token Protocol
### Turning Physical Waste into On-Chain Value

> **Hackathon:** Web3 Unsolved Challenges Hackathon 2026  
> **Track:** Real-World Impact / Sustainability / DePIN + AI  
> **Team:** ReClaim (1-4 members)  
> **Status:** Deployed on Base Sepolia. Contracts live and verified working on-chain. Scan and classify run on device; minting needs an IPFS key, see section 9.2.

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
- **Testnet:** live on Base Sepolia (chain 84532). Addresses also in `contracts/deployments.json`.
  - ReClaim: [`0xb94e49223B0d5A0cfC9b60d1646fCdd613a1AC05`](https://sepolia.basescan.org/address/0xb94e49223B0d5A0cfC9b60d1646fCdd613a1AC05)
  - ReClaimToken: [`0x6ED5dbFEB60aFeBdA27ba8847085fEB53C34c182`](https://sepolia.basescan.org/address/0x6ED5dbFEB60aFeBdA27ba8847085fEB53C34c182)
  - ReceiptNFT: [`0xd4ff647376a9cF5c22E85351FeC6BBa3c66FAb68`](https://sepolia.basescan.org/address/0xd4ff647376a9cF5c22E85351FeC6BBa3c66FAb68)
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
| **Storage** | IPFS via Pinata (Lighthouse supported as fallback), pinned server-side; `keccak256` of the pinned bytes stored on-chain |
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
| IPFS pinning | **Real** when `PINATA_JWT` or `LIGHTHOUSE_API_KEY` is set. Without a working provider the app names the failure and refuses to mint, rather than inventing a CID |
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
- **Hydration.** `Math.random()` and `new Date()` were being called inside JSX, so the server
  and client disagreed and React threw on every load. Time values now populate after mount,
  and the receipt's invoice number is derived from the real image hash instead of a random
  number.
- **CSP and model hosting.** Our own Content-Security-Policy was blocking `tfhub.dev`, so
  the model never loaded. Rather than widen the policy, the MobileNet weights are now
  self-hosted in `frontend/public/model` (14 MB). The demo no longer depends on venue wifi
  reaching a third-party host, and `connect-src` stays tight. Verified: the self-hosted
  model returns predictions identical to the remote one.
- **Tailwind was never running.** `postcss.config.js` did not exist, so Next silently
  skipped Tailwind and shipped 35 CSS rules instead of 363. The entire designed interface
  was rendering as unstyled HTML. Added the config and pointed `content` at `./lib` instead
  of the deleted `./components`.
- **Docs.** All eleven supporting documents were corrected to match the code. They
  previously carried "98% accuracy", "TrashNet", "custom 12k dataset", "Chainlink VRF",
  "GPS clustering", and "RainbowKit", none of which the code supported.

### 9.2 Remaining work, in priority order

Steps 1 to 3 of the previous handoff are done. What follows is what is genuinely left.

**1. Add a Pinata JWT. This is the only thing blocking a live mint.**

The contracts are deployed and the frontend points at them, but `submitProof` requires a
non-empty CID and the app refuses to invent one, so pinning has to work before anything
mints.

Use Pinata, not Lighthouse. `node.lighthouse.storage` is blocked on the development
network: DNS resolves but the TCP connection never opens, while Base and Pinata are both
reachable from the same machine. The route supports either and tries Pinata first, so a
Lighthouse key still works anywhere it is reachable.

Get a free JWT at https://app.pinata.cloud (API Keys, New Key, copy the JWT) and put it in
`frontend/.env.local`:

```
PINATA_JWT=your_jwt_here
```

No `NEXT_PUBLIC_` prefix. That prefix is what leaked the key to the browser before.

**1b. Optional: verify the source on BaseScan** so judges can read the code on-chain.
Needs a free key from https://etherscan.io/apis in `contracts/.env` as `BASESCAN_API_KEY`,
then:

```bash
cd contracts
npx hardhat verify --network baseSepolia 0xb94e49223B0d5A0cfC9b60d1646fCdd613a1AC05 0x6ED5dbFEB60aFeBdA27ba8847085fEB53C34c182 0xd4ff647376a9cF5c22E85351FeC6BBa3c66FAb68
```

**2. Confirm a positive classification on a real photograph.**

The classifier is verified working: MobileNet v2 loads from local weights in about 6 seconds
with no external network, and returns real ImageNet predictions. The refusal path was
confirmed on synthetic test images (the model answered "spotlight" and "umbrella", and the
app correctly declined both). What has **not** been exercised is a successful match, because
that needs a real photo of real waste, which synthetic canvas drawings cannot stand in for.

Point the camera at a plastic bottle, an aluminium can, or a banana. Expect a material, a
confidence figure, and the raw ImageNet class it matched. If real objects refuse more often
than you like, widen the map in `frontend/lib/classify.ts`; the map, not the model, is the
part worth tuning.

**3. Record the demo video.** Not started.

**4. Optional, only after the above.**

GPS clustering as an anti-gaming signal is now claimed nowhere and implemented nowhere,
which is consistent. If you want it back as a differentiator, it needs a `bytes8 geohash`
parameter on `submitProof`, a per-geohash daily cap, and updates to every test. Do not
re-add the claim to the docs without the code.

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
