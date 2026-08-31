/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFBF0",
        paperDeep: "#FFF4D6",
        kraft: "#C9A98A",
        kraftDark: "#8A6B4E",
        ink: "#0F0F0E",
        inkMuted: "#3A3A38",
        scanner: "#FF3B30",
        scannerDark: "#CC2F26",
        verified: "#0E7C6B",
        verifiedBg: "#E6F4F1",
        rule: "#E8E0C9",
        ruleDark: "#D4C9A8",
        caution: "#FFB800",
      },
      fontFamily: {
        display: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
        receipt: ["Geist Mono", "monospace"],
      },
      boxShadow: {
        receipt: "0 18px 40px rgba(15,15,14,0.12), 0 2px 8px rgba(15,15,14,0.08)",
        scanner: "0 20px 44px rgba(255,59,48,0.22), 0 6px 16px rgba(15,15,14,0.10)",
        stamp: "0 1px 0 rgba(15,15,14,0.12)",
      },
      keyframes: {
        print: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(0)" } },
        scan: { "0%": { transform: "translateY(0)", opacity: "0.9" }, "50%": { opacity: "1" }, "100%": { transform: "translateY(220px)", opacity: "0.9" } },
        perforate: { "0%,100%": { opacity: "0.9" }, "50%": { opacity: "1" } },
        stamp: { "0%": { transform: "scale(1.08) rotate(-1.5deg)", opacity: "0" }, "60%": { transform: "scale(1) rotate(-1.5deg)", opacity: "1" }, "100%": { transform: "scale(1) rotate(-1.5deg)", opacity: "1" } },
      },
      animation: {
        print: "print 520ms cubic-bezier(0.16,1,0.3,1)",
        scan: "scan 1.6s linear infinite",
        stamp: "stamp 420ms cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};
