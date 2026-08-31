import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "ReClaim — Trash to receipt. Receipt to token.",
  description: "Scan household waste, print a verifiable receipt on Base Sepolia. Phone-as-oracle DePIN. Trash to token in <10s.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink antialiased">
        <div dangerouslySetInnerHTML={{ __html: `<!-- THESIS: Scanning trash and printing a receipt are the same gesture — the receipt IS the on-chain proof. Refuses floating mock + metric cards. OWN-WORLD: Warm thermal paper (#FFFBF0), kraft, scanner red (#FF3B30), hairline ruled modules, perforated edges, mono receipt type, ink stamps, stud-grid alignment. Light workshop daylight. STORY: Judge sees scanner gun over waste, watches laser sweep and receipt print with hash/CID, understands proof in 5s and taps Scan → Mint. FIRST VIEWPORT: Left 54% scanner gun overlapping perforated receipt mid-print with headline; Right 44% scanner window with live video + barcode + pull-trigger. FORM: Hardware store receipt + thermal scanner — grounded 4/7, seed a1b2c3d4. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->` }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
