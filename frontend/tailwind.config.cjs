module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.js",
  ],
  theme: {
    extend: {
      screens: {
        console: "1200px",
        short: { raw: "(min-width: 1200px) and (max-height: 760px)" },
      },
      colors: {
        ink: "#080D10",
        panel: "#0b181d",
        line: "#263B42",
        aqua: "#5EDDD5",
        muted: "#94AEB6",
        elevated: "#142329",
        primary: "#F1F7F8",
        hover: "#7CECE4",
        subtle: "#69838B",
        pos: "#60d6b6",
        neg: "#ed9891",
        neu: "#9faed2",
      },
      fontFamily: { sans: ["var(--seed)", "sans-serif"] },
      maxWidth: { dashboard: "1440px" },
      borderRadius: { card: "6px" },
      boxShadow: { panel: "0 4px 24px #00000014" },
      fontSize: { title: ["1.875rem", "1.35"], metric: ["2rem", "1.2"] },
      backgroundImage: {
        scan: "linear-gradient(#33767c20 1px, transparent 1px),linear-gradient(90deg,#33767c20 1px,transparent 1px)",
      },
      keyframes: {
        appear: {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: { appear: "appear 280ms ease-out both" },
    },
  },
};
