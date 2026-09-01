# Solution — ReClaim Protocol

## One Line
**Phone camera + AI + IPFS + Base L2 = Verifiable Trash-to-Token.**

## How It Works (User Journey)

1. **Scan:** User opens ReClaim dApp, points camera at waste (e.g., aluminum can on table)
2. **AI Classify (on-device):** TensorFlow.js MobileNet fine-tuned classifies: `Aluminum (94% confidence)`, `Weight est: 15g`
3. **Proof Bundle:** App creates `keccak256(imageBytes + gps + timestamp + userAddress)`, uploads image to IPFS (Lighthouse), gets CID
4. **Submit Tx:** Call `ReClaim.submitProof(materialType, confidence, ipfsCID, imageHash)` —  gas ~ $0.01 on Base Sepolia
5. **Instant Mint (if confidence > 85 and no duplicate hash):** 
   - `ReceiptNFT` (ERC-721) minted to user with metadata: material, CID, location, timestamp
   - `$RECLAIM` (ERC-20) minted: reward table below
6. **Auditor Challenge (10% flagged):** `auditFlagged(imageHash)` marks about 10% of receipts, deterministically and recomputable by anyone. A staked auditor bonds 50 $RECLAIM to challenge one. A correct challenge burns the receipt and claws the reward back via `burnFrom`; a wrong one forfeits the bond. Adjudication is owner-only in this MVP, a placeholder for a token-weighted vote.
7. **Redeem:** Tokens used for partner discounts, swapped on DEX, or staked for governance weight.

## Reward Table (Material-Weighted)

| Material | Reward $RECLAIM | Rationale |
|----------|-----------------|-----------|
| Aluminum | 50 | High energy savings (95%) |
| Glass | 30 | Infinitely recyclable |
| PET Plastic | 20 | High volume, low value |
| HDPE | 20 |  |
| E-Waste | 100 | Toxic, high value |
| Organic | 10 | Composting |

Governance can update weights.

## Unique Value vs Competitors

- **No hardware:** Pure phone, unlike smart bins ($500 each)
- **Anti-gaming stack:** 
  - Image hash dedup (keccak on-chain)
  - Confidence threshold
  - Staked auditors with slashing
- **Composability:** Receipt NFTs = on-chain reputation; $RECLAIM = ERC-20 liquid
- **Real oracle innovation:** Solves physical-action oracle, not price oracle

## Innovation

- First **Proof-of-Recycling** consensus for waste
- **DePIN phone-as-oracle** network — every phone becomes validator
- Material-weighted tokenomics reflecting true environmental cost

## Impact

- Direct: incentivizes household recycling, measurable tons diverted
- Indirect: verifiable ESG data for brands, new carbon credit primitive
- Scale: If 10k users recycle 1kg/week = 520 tonnes/year diverted

## Technical Proof

- Contracts deployed and verified on Base Sepolia
- Frontend demo classifies 6 materials live
- IPFS CIDs resolve
- Tests: 12 Hardhat tests passing
