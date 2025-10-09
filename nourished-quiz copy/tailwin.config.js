/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: { primary: "#111827", accent: "#7c3aed" },
      },
      borderRadius: { '2xl': '1rem' },
    },
  },
  plugins: [],
};
