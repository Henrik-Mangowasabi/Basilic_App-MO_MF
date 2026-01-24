import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        basilic: {
          50: "#e6f2ef",
          100: "#b3d9cf",
          200: "#80bfaf",
          300: "#4da68f",
          400: "#1a8c6f",
          500: "#008060", // Primary color
          600: "#007356",
          700: "#00664d",
          800: "#005a43",
          900: "#004d3a",
        }
      }
    },
  },
  darkMode: "class",
  plugins: [heroui({
    themes: {
      light: {
        colors: {
          primary: {
            DEFAULT: "#008060",
            foreground: "#ffffff",
          },
          focus: "#008060",
        },
      },
      dark: {
        colors: {
          primary: {
            DEFAULT: "#008060",
            foreground: "#ffffff",
          },
          focus: "#008060",
        },
      },
    }
  })],
}
