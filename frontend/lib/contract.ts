export const RECLAIM_ABI = [
  { inputs: [{ internalType: "uint8", name: "material", type: "uint8" }, { internalType: "uint8", name: "confidence", type: "uint8" }, { internalType: "string", name: "ipfsCID", type: "string" }, { internalType: "bytes32", name: "imageHash", type: "bytes32" }], name: "submitProof", outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], name: "receiptHash", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], name: "usedImageHashes", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "imageHash", type: "bytes32" }], name: "auditFlagged", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "pure", type: "function" },
  { anonymous: false, inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: false, internalType: "uint8", name: "material", type: "uint8" },
      { indexed: false, internalType: "bytes32", name: "imageHash", type: "bytes32" },
      { indexed: false, internalType: "string", name: "ipfsCID", type: "string" },
      { indexed: false, internalType: "bool", name: "auditFlagged", type: "bool" },
    ], name: "ProofSubmitted", type: "event" },
] as const;

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
