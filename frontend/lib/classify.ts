"use client";
import type * as mobilenet from "@tensorflow-models/mobilenet";

export const MATERIALS = [
  { id: 0, label: "PET Plastic", sku: "PT-20", reward: 20 },
  { id: 1, label: "HDPE", sku: "HD-20", reward: 20 },
  { id: 2, label: "Aluminum", sku: "AL-50", reward: 50 },
  { id: 3, label: "Glass", sku: "GL-30", reward: 30 },
  { id: 4, label: "E-Waste", sku: "EW-100", reward: 100 },
  { id: 5, label: "Organic", sku: "OR-10", reward: 10 },
] as const;

export type Material = (typeof MATERIALS)[number];

/**
 * MobileNet is an ImageNet classifier, not a waste classifier. We map the
 * ImageNet classes that correspond to real household waste onto our six
 * materials. Anything outside this map is deliberately not classified,
 * because the protocol refuses to mint a proof it cannot substantiate.
 *
 * ponytail: substring match over a curated map. Replace with a fine-tuned
 * waste model when the refusal rate on real trash gets annoying.
 */
const MATERIAL_BY_IMAGENET: Array<[string[], number]> = [
  [["water bottle", "pop bottle", "soda bottle", "pill bottle"], 0],
  [["plastic bag", "bucket", "pail", "shampoo", "lotion", "packet"], 1],
  [["beer can", "milk can", "canister", "tin"], 2],
  [["beer glass", "wine bottle", "beer bottle", "goblet", "vase", "water jug", "jar", "cup"], 3],
  [["cellular telephone", "laptop", "notebook", "desktop computer", "monitor", "screen", "remote control", "computer keyboard", "typewriter keyboard", "mouse", "iPod", "hard disc", "modem", "printer", "loudspeaker", "cassette", "joystick", "power drill"], 4],
  [["banana", "orange", "lemon", "Granny Smith", "pineapple", "strawberry", "fig", "pomegranate", "corn", "broccoli", "cauliflower", "cucumber", "zucchini", "mushroom", "bell pepper", "head cabbage", "artichoke"], 5],
];

function toMaterialId(className: string): number | null {
  const c = className.toLowerCase();
  for (const [needles, id] of MATERIAL_BY_IMAGENET) {
    if (needles.some((n) => c.includes(n.toLowerCase()))) return id;
  }
  return null;
}

let modelPromise: Promise<mobilenet.MobileNet> | null = null;

/** Loads MobileNet v2 once. Safe to call repeatedly. */
export function loadModel() {
  if (!modelPromise) {
    // Dynamic so the ~330kB of TensorFlow stays out of the first paint.
    // Weights are self-hosted from /public/model. Loading them from tfhub.dev at
    // runtime means the demo dies on bad venue wifi, and it needs a CSP hole.
    modelPromise = (async () => {
      const [tf, mn] = await Promise.all([import("@tensorflow/tfjs"), import("@tensorflow-models/mobilenet")]);
      await tf.ready();
      return mn.load({ version: 2, alpha: 1.0, modelUrl: "/model/model.json" });
    })();
  }
  return modelPromise;
}

export type ClassifyResult =
  | { ok: true; material: Material; confidence: number; rawClass: string }
  | { ok: false; reason: string; rawClass: string | null };

/**
 * Classifies a frame on-device. Returns ok:false when the image is not
 * recognisable waste, or the model is not confident enough to mint against.
 */
export async function classify(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<ClassifyResult> {
  const model = await loadModel();
  const preds = await model.classify(input, 5);
  if (!preds.length) return { ok: false, reason: "Nothing detected in frame.", rawClass: null };

  for (const p of preds) {
    const id = toMaterialId(p.className);
    if (id === null) continue;
    const confidence = Math.round(p.probability * 100);
    if (confidence < 85) {
      return {
        ok: false,
        reason: `Recognised "${p.className}" at ${confidence}%, below the 85% on-chain threshold. Fill the frame and hold steady.`,
        rawClass: p.className,
      };
    }
    return { ok: true, material: MATERIALS[id], confidence, rawClass: p.className };
  }

  return {
    ok: false,
    reason: `Saw "${preds[0].className}", which is not a recyclable material this protocol accepts.`,
    rawClass: preds[0].className,
  };
}
