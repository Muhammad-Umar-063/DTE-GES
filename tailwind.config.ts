import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1A5FB4",
        "blue-light": "#EEF3FB",
        "blue-mid": "#C5D8F5",

        green: "#1B7D3A",
        "green-light": "#E8F5EC",

        amber: "#8B5000",
        "amber-light": "#FFF3E0",
        "amber-mid": "#FDE8B4",

        red: "#B8002C",
        "red-light": "#FDEEF2",

        purple: "#5C35A0",
        "purple-light": "#F0EBFB",

        surface: "#FFFFFF",
        "surface-2": "#F5F6FA",
        "surface-3": "#F0F2F8",

        border: "#E2E6EF",
        "border-strong": "#CDD3E0",

        "text-primary": "#0F1623",
        "text-secondary": "#475467",
        "text-muted": "#8A94A6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "page-title": ["20px", { lineHeight: "28px", fontWeight: "700" }],
        "section-title": ["16px", { lineHeight: "22px", fontWeight: "700" }],
        "card-title": ["13px", { lineHeight: "18px", fontWeight: "700" }],
        body: ["13px", { lineHeight: "20px", fontWeight: "400" }],
        label: [
          "10px",
          { lineHeight: "14px", fontWeight: "700", letterSpacing: "0.08em" },
        ],
        mono: ["12px", { lineHeight: "18px", fontWeight: "400" }],
        badge: ["10px", { lineHeight: "14px", fontWeight: "700" }],
      },
      spacing: {
        "page-x": "24px",
        "page-y": "20px",
        card: "16px",
        section: "16px",
        "row-h": "44px",
        sidebar: "220px",
      },
      borderRadius: {
        card: "8px",
        button: "6px",
        input: "6px",
        pill: "20px",
        badge: "20px",
        tag: "4px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,.08)",
      },
      borderColor: {
        DEFAULT: "#E2E6EF",
      },
    },
  },
  plugins: [],
};
export default config;
