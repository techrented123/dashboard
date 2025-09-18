/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#32429B",
          50: "#eef0fb",
          100: "#dfe3f8",
          200: "#c3caf1",
          300: "#a0a9e6",
          400: "#7c86d7",
          500: "#5f69c6",
          600: "#4852ae",
          700: "#3a439d",
          800: "#32429B",
          900: "#262f73",
        },
        secondary: {
          DEFAULT: "#077BFB",
          50: "#e7f2ff",
          100: "#d4e9ff",
          200: "#a9d2ff",
          300: "#7cbbff",
          400: "#4fa5ff",
          500: "#268fff",
          600: "#077BFB",
          700: "#0e6ad1",
          800: "#0f54a3",
          900: "#0e4079",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#64748b",
          foreground: "#94a3b8",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
