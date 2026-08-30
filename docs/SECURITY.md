# Security Review — ReClaim (Pre-Audit Checklist)

## Scope
Contracts: ReClaim.sol, ReClaimToken.sol, ReceiptNFT.sol
Network: Base Sepolia (EVM Cancun), Solidity 0.8.24

## Checks Passed
- [x] ReentrancyGuard on submitProof (mint external calls)
- [x] No delegatecall / selfdestruct
- [x] Ownable for admin (setReward, slash) — no privilege escalation beyond reward table
- [x] usedImageHashes prevents replay (keccak256 of imageBytes+gsp+timestamp)
- [x] MIN_CONFIDENCE threshold prevents low-quality spam
- [x] Custom errors (gas efficient) instead of require strings
- [x] ERC721 _safeMint used
- [x] Minter isolation: only ReClaim can mint Token/NFT (setMinter Ownable)
- [x] Auditor staking requires token transferFrom + allowance, slashing via slash()
- [x] 27 Hardhat tests including access control, duplicate, boundary, gas

## Known MVP Limitations (Disclosed to Judges)
- VRF lottery mocked to pseudo-random (10% comment). Production: Chainlink VRF v2.5 + Functions for AI attestation
- No oracle for GPS truth — MVP uses hash + clustering heuristic; production add geohash staking
- No formal audit — this checklist is internal; Recommend Slither + OpenZeppelin Audit before mainnet
- IPFS pinning via Lighthouse requires API key, mocked to hash in demo fallback

## How to Run Slither (for future)
```bash
pip install slither-analyzer
slither contracts/contracts/ReClaim.sol --filter-paths node_modules
```

## Recommendations for Mainnet
- Add timelock for setReward
- Add pause mechanism (Pausable)
- Use ERC721Enumerable for off-chain indexing vs gas
- Add EIP-712 signed proofs for gasless submission via relayer
