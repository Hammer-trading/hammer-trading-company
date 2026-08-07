import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111416",
        steel: "#5F6B70",
        brass: "#A88738",
        safety: "#D51F2C",
        mint: "#147D64"
      },
      boxShadow: {
        glow: "0 18px 70px rgba(15, 23, 42, 0.14)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(0deg)" },
          "50%": { transform: "translate3d(0, -18px, 0) rotate(1deg)" }
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" }
        },
        wave: {
          "0%": { backgroundPosition: "0 100%" },
          "100%": { backgroundPosition: "24px 100%" }
        }
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
        wave: "wave 1.1s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
