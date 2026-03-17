/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070b10",
        ember: "#d9b777",
        jade: "#7ca38b",
        mist: "#d9d0bf",
        lacquer: "#101821",
      },
      fontFamily: {
        display: ["'Noto Serif SC'", "'Source Han Serif SC'", "'Songti SC'", "serif"],
        body: ["'Noto Sans SC'", "'Source Han Sans SC'", "'PingFang SC'", "sans-serif"],
      },
      boxShadow: {
        glow: "0 30px 120px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(217, 183, 119, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(217, 183, 119, 0.08) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
