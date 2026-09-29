module.exports = {
  content: ["./index.html", "./script.js"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0f051d",
          card: "#1a0b2e",
          purple: "#2b1055",
          pink: "#e91e63",
          magenta: "#d81b60",
          teal: "#00bcd4",
          lime: "#8bc34a",
          violet: "#9c27b0",
          yellow: "#ffeb3b",
          cyan: "#00e5ff",
        },
      },
      fontFamily: {
        heading: ['"Bubblegum Sans"', "cursive", "sans-serif"],
        body: ['"Inter"', "sans-serif"],
      },
    },
  },
};
