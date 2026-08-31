import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected } from "@wagmi/core";

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org"),
  },
  ssr: true,
});

export const BASESCAN = "https://sepolia.basescan.org";
