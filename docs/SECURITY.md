# Security Review — ReClaim (Pre-Audit Checklist)

## Scope
Contracts: ReClaim.sol, ReClaimToken.sol, ReceiptNFT.sol
Network: Base Sepolia (EVM Cancun), Solidity 0.8.24

## Checks Passed
- [x] ReentrancyGuard on submitProof (mint external calls)
- [x] No delegatecall / selfdestruct
- [x] Ownable for admin (setReward, resolveChallenge). Owner adjudicates challenges in this MVP, which is a trust assumption we state rather than hide
- [x] usedImageHashes prevents replay (keccak256 of imageBytes+gsp+timestamp)
- [x] MIN_CONFIDENCE threshold prevents low-quality spam
- [x] Custom errors (gas efficient) instead of require strings
- [x] ERC721 _safeMint used
- [x] Minter isolation: only ReClaim can mint Token/NFT (setMinter Ownable)
- [x] Auditor staking requires transferFrom + allowance. Bonds lock via `lockedStake` so they cannot be withdrawn mid-challenge, and are forfeited or released by `resolveChallenge`
- [x] 27 Hardhat tests including access control, duplicate, boundary, gas

## Known MVP Limitations (Disclosed to Judges)
- Audit selection is `uint256(imageHash) % 100 < 10`, deterministic and publicly verifiable. A submitter can grind hashes offline to dodge the flag. Chainlink VRF v2.5 is the upgrade path, and this ceiling is marked in the contract
- No location data is collected and GPS clustering is not implemented. It is not claimed anywhere
- No formal audit — this checklist is internal; Recommend Slither + OpenZeppelin Audit before mainnet
- IPFS pinning runs server-side in `app/api/ipfs` so the Lighthouse key never reaches the browser. It was previously read as `NEXT_PUBLIC_LIGHTHOUSE_KEY`, which shipped it to every visitor. Without a key the app refuses to pin rather than inventing a CID

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
