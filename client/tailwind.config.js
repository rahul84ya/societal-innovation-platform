/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'saffron': '#FF9933',
        'india-green': '#138808',
        'navy-blue': '#000080',
        'gov-gray': '#f2f2f2'
      }
    },
  },
  plugins: [],
}
