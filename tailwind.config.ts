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
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          soft: "var(--color-primary-soft)",
          on: "var(--color-primary-on)"
        },
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--color-surface-muted)",
          sidebar: "var(--color-surface-sidebar)",
          elevated: "var(--color-surface-elevated)"
        },
        line: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
          soft: "var(--color-border-soft)"
        },
        text1: "var(--text1)",
        text2: "var(--text2)",
        text3: "var(--text3)",
        success: "var(--color-success)",
        danger: "var(--color-danger)",
        warning: "var(--color-warning)",
        info: "var(--color-info)",
        "app-black": "var(--color-app-black)",
        "app-white": "var(--color-app-white)",
        "app-gray": "var(--color-app-gray)",
        lavender: "var(--color-lavender)",
        "citrus-green": "var(--color-citrus-green)",
        peach: "var(--color-peach)",
        "sunset-orange": "var(--color-sunset-orange)",
        "glacier-blue": "var(--color-glacier-blue)",
        "app-blue": "var(--color-app-blue)",
        "deep-green": "var(--color-deep-green)",
        "app-pink": "var(--color-app-pink)",
        dash: {
          bg: "var(--dash-bg)",
          ink: "var(--dash-ink)",
          card: "var(--dash-card-bg)",
          "card-border": "var(--dash-card-border)",
          indicator: "var(--dash-indicator)"
        },
        "pc-bg-alt": "var(--pc-bg-alt)"
      },
      fontFamily: {
        serif: ["var(--font-serif)"],
        "sans-en": ["var(--font-sans-en)"],
        "sans-kr": ["var(--font-sans-kr)"],
        pc: ["var(--pc-font-sans)"],
        "pc-kr": ["var(--pc-font-kr)"]
      },
      fontSize: {
        "pc-xs": "var(--pc-text-xs)",
        "pc-sm": "var(--pc-text-sm)",
        "pc-base": "var(--pc-text-base)",
        "pc-md": "var(--pc-text-md)",
        "pc-lg": "var(--pc-text-lg)",
        "pc-xl": "var(--pc-text-xl)",
        "pc-2xl": "var(--pc-text-2xl)",
        "pc-3xl": "var(--pc-text-3xl)",
        "pc-4xl": "var(--pc-text-4xl)",
        "dash-section": "var(--dash-section-title-size)",
        "dash-hero": "var(--dash-hero-value-size)"
      },
      borderRadius: {
        pc: "var(--pc-radius)"
      },
      boxShadow: {
        "pc-sm": "var(--pc-shadow-sm)",
        pc: "var(--pc-shadow)",
        "pc-md": "var(--pc-shadow-md)",
        "pc-lg": "var(--pc-shadow-lg)",
        float: "var(--dash-float-shadow)"
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
