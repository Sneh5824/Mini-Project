/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#0a0a0f",
          900: "#0f0f1a",
          800: "#16162a",
          700: "#1e1e35",
          600: "#28284a",
        },
        accent: {
          DEFAULT: "#7c3aed",
          hover:   "#6d28d9",
          light:   "#a78bfa",
          dim:     "#4c1d95",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease",
        "slide-up":   "slideUp 0.25s ease",
        "pulse-soft": "pulseSoft 2s infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { transform: "translateY(8px)", opacity: 0 }, to: { transform: "translateY(0)", opacity: 1 } },
        pulseSoft: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
};
