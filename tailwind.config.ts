import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        hu: {
          black: "#000000",
          white: "#ffffff",
          beige: "#f4f0ed",
          "beige-hover": "#e8e2de",
          muted: "#898989",
          body: "#5c5c5c",
          accent: "#a8a09c",
          leader: "#d8d8d8",
          cta: "#191919",
          "dot-inactive": "#464646"
        }
      },
      fontFamily: {
        serif: ["var(--font-serif)"],
        "sans-en": ["var(--font-sans-en)"],
        "sans-kr": ["var(--font-sans-kr)"]
      },
      maxWidth: {
        frame: "1440px",
        content: "1178px"
      },
      spacing: {
        side: "131px"
      }
    }
  },
  plugins: []
};

export default config;
