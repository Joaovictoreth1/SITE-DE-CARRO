export default {
  content: ["./*.html", "./src/**/*.ts"],

  theme: {
    extend: {
      fontFamily: {
        heading: ["Bebas Neue", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      colors: {
        brand: {
          dark: "#020202",
          light: "#e5e5e5",
          accent: "#ff1e1e",
          alert: "#ffb700",
          success: "#00ff88",
        },
      },
    },
  },
};
