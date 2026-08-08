import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0b12",
        panel: "#14141f",
        panel2: "#1c1c2b",
        accent: "#ff3d68",
        accent2: "#7c4dff",
        gold: "#ffc857",
        good: "#22d3a7",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0px rgba(255,61,104,0.0)" },
          "50%": { boxShadow: "0 0 40px rgba(255,61,104,0.45)" },
        },
        floatUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        floatUp: "floatUp 0.5s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
