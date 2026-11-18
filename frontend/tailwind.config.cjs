module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#080e11",
        panel: "#0d191e",
        line: "#23383e",
        aqua: "#6ce4d9",
        muted: "#abc0c3",
        pos: "#60d6b6",
        neg: "#ed9891",
        neu: "#9faed2",
      },
      fontFamily: { sans: ["var(--seed)", "sans-serif"] },
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
