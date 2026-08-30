import "./globals.css";
export const metadata = { title: "ReClaim — Trash to Token", description: "Phone camera → AI → On-chain recycling proof" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body></html>;
}
