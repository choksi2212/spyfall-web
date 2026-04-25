/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mystic: {
          void: "#050308",
          night: "#0a0612",
          blood: "#6b0f1a",
          crimson: "#9e1b32",
          rose: "#c73e5a",
          gold: "#c9a962",
          pale: "#e8dcc4",
          mist: "#9a8f9e",
        },
      },
      fontFamily: {
        display: ["Cinzel", "serif"],
        body: ["Cormorant Garamond", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(158, 27, 50, 0.35)",
        gold: "0 0 20px rgba(201, 169, 98, 0.25)",
      },
    },
  },
  plugins: [],
};
