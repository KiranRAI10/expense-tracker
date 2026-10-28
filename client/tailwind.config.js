/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1B2430",
          light: "#28333F",
          muted: "#3D4A59",
        },
        paper: {
          DEFAULT: "#F7F5F0",
          dim: "#EFEBE2",
        },
        ledger: {
          DEFAULT: "#3F7259",
          light: "#6B9E7F",
          dark: "#2C523F",
        },
        rust: {
          DEFAULT: "#C1533E",
          light: "#D9885A",
        },
        amber: {
          DEFAULT: "#C98A2C",
        },
        slate: {
          DEFAULT: "#6B7785",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
}

