export const RECLAIM_ABI = [
  { inputs: [{ internalType: "uint8", name: "material", type: "uint8" }, { internalType: "uint8", name: "confidence", type: "uint8" }, { internalType: "string", name: "ipfsCID", type: "string" }, { internalType: "bytes32", name: "imageHash", type: "bytes32" }], name: "submitProof", outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], name: "receiptHash", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], name: "usedImageHashes", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
] as const;

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
