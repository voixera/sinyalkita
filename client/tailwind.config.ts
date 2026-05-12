import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1628",
        "ink-soft": "#24344D",
        ocean: "#0F3A63",
        mist: "#F4F7FA",
        line: "#D8E0E8",
        success: "#2F9A6D",
        "success-soft": "#E7F6EF",
        warning: "#B9822E",
        "warning-soft": "#FFF4DF",
        danger: "#B85C66",
        "danger-soft": "#F9E8EA"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(15, 35, 60, 0.10)",
        lift: "0 20px 60px rgba(11, 22, 40, 0.16)"
      },
      borderRadius: {
        xl: "0.875rem"
      }
    }
  },
  plugins: [forms]
};

export default config;
