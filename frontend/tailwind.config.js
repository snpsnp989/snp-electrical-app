/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-blue': '#1e3a8a',
        'darker-blue': '#1e40af',
      }
    },
  },
  plugins: [],
}
