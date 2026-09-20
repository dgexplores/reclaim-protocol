"use client";

/**
 * Demo dataset for ReClaim.
 *
 * Purpose: let anyone understand and hard-test the product in under a minute,
 * even with no wallet, no camera, and no contract deployment.
 *
 * Honesty rules (do not weaken):
 * - Every demo row is badged "Demo" in the UI and never links to fake
 *   BaseScan / IPFS URLs (fake links would 404 and erode trust).
 * - The one real on-chain example (Receipt #0) is linked separately with its
 *   real tx hash + CID from the README, clearly labeled as the real example.
 * - Demo hashes/CIDs are syntactically valid (0x + 64 hex) but prefixed so a
 *   reviewer can tell at a glance they are not real claims.
 */

export type DemoProof = {
  tokenId: bigint;
  material: number;
  imageHash: `0x${string}`;
  auditFlagged: boolean;
  txHash: `0x${string}`;
};

const h = (s: string) => `0x${s}` as `0x${string}`;

export const DEMO_PROOFS: DemoProof[] = [
  { tokenId: 0n, material: 0, imageHash: h("1a2b".repeat(16)), auditFlagged: false, txHash: h("aa11".repeat(16)) },
  { tokenId: 1n, material: 2, imageHash: h("3c4d".repeat(16)), auditFlagged: true, txHash: h("bb22".repeat(16)) },
  { tokenId: 2n, material: 3, imageHash: h("5e6f".repeat(16)), auditFlagged: false, txHash: h("cc33".repeat(16)) },
  { tokenId: 3n, material: 4, imageHash: h("7081".repeat(16)), auditFlagged: false, txHash: h("dd44".repeat(16)) },
  { tokenId: 4n, material: 1, imageHash: h("92ab".repeat(16)), auditFlagged: false, txHash: h("ee55".repeat(16)) },
  { tokenId: 5n, material: 5, imageHash: h("cdef".repeat(16)), auditFlagged: true, txHash: h("ff00".repeat(16)) },
];

/** Human context for each demo receipt (not on-chain fields). */
export const DEMO_META: Record<string, { confidence: number; place: string; when: string; cid: string }> = {
  "0": { confidence: 94, place: "SRMS Canteen", when: "2 min ago", cid: "QmDemoPetBottleClaimedAtSrmsCanteenTestData0001" },
  "1": { confidence: 96, place: "Hostel Block B", when: "18 min ago", cid: "QmDemoAluminumCanClaimedAtHostelBlockBTest002" },
  "2": { confidence: 91, place: "Lab 3", when: "1 hr ago", cid: "QmDemoGlassJarClaimedAtLabThreeTestData000003" },
  "3": { confidence: 89, place: "Library e-bin", when: "3 hrs ago", cid: "QmDemoEwastePhoneClaimedAtLibraryBinTest00004" },
  "4": { confidence: 93, place: "Workshop", when: "Yesterday", cid: "QmDemoHdpeClaimedAtWorkshopTestData00000005" },
  "5": { confidence: 95, place: "Mess Hall", when: "Yesterday", cid: "QmDemoOrganicClaimedAtMessHallTestData0000006" },
};

/** The one real on-chain example from the README (verifiable, not demo). */
export const REAL_EXAMPLE = {
  tx: "0xe48c33c590a5fff70eca9db9d18d495f289e7d5e00b72de329b3db8419deaabe",
  cid: "QmYLH36w1G121xxZF5BRHewu3aTK6i7Rn7xZMqrHu3x95i",
};

export type DemoScanPreset = {
  key: string;
  title: string;
  hint: string;
  materialId: number;
  confidence: number;
  rawClass: string;
  cid: string;
  hash: `0x${string}`;
};

/**
 * One-tap demo scans. They populate the exact same receipt + mint-rail UI as a
 * real scan (no separate mock screen to maintain), but the File ID is prefixed
 * QmDemo so the UI renders it as text instead of a fake IPFS link.
 */
export const DEMO_SCANS: DemoScanPreset[] = [
  {
    key: "aluminum",
    title: "Demo: aluminum can",
    hint: "Happy path, 96%, above threshold",
    materialId: 2,
    confidence: 96,
    rawClass: "beer can",
    cid: "QmDemoScanAluminumCan96pctAboveThresholdTest0001",
    hash: h("d3a7".repeat(16)),
  },
  {
    key: "pet",
    title: "Demo: plastic bottle",
    hint: "Happy path, 93%, above threshold",
    materialId: 0,
    confidence: 93,
    rawClass: "water bottle",
    cid: "QmDemoScanPetBottle93pctAboveThresholdTest00002",
    hash: h("b4e9".repeat(16)),
  },
  {
    key: "lowconf",
    title: "Demo: low confidence",
    hint: "Retake path, 78%, below 85% threshold",
    materialId: 3,
    confidence: 78,
    rawClass: "wine bottle",
    cid: "QmDemoScanGlassJar78pctBelowThresholdTest00003",
    hash: h("87cf".repeat(16)),
  },
];

export const isDemoCid = (cid: string) => cid.startsWith("QmDemo");
