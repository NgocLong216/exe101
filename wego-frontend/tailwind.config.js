/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2B7CEE",
        "background-light": "#f6f6f8",
        "background-dark": "#101322",
      },
    },
  },
  plugins: [],
}