/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Playfair Display", "ui-serif", "serif"],
      },
      colors: {
        page: "#f5f3ee",
        surface: "#ffffff",
        muted: "#eeece6",
        contrast: "#161b1f",
        strong: "#0b0e12",
        body: "#3d4756",
        subdued: "#5a6472",
        border: "#d8dee7",
        primary: {
          400: "#1ab27f",
          500: "#0ea271",
          600: "#0a8a61",
          700: "#076f4d",
        },
        ink: {
          950: "#07090b",
          900: "#0e1216",
          800: "#141a21",
        },
        pearl: {
          50: "#f7f6f2",
          100: "#f1efe8",
          200: "#e5e1d6",
        },
        emerald: {
          400: "#39d6a6",
          500: "#18c491",
          600: "#10a67c",
        },
        royal: {
          500: "#2a4cff",
          600: "#1f3fe0",
        },
        gold: {
          300: "#f7d48b",
          400: "#e9c16a",
        },
      },
      boxShadow: {
        sm: "0 8px 20px -16px rgba(17, 20, 24, 0.24)",
        md: "0 18px 40px -24px rgba(17, 20, 24, 0.3)",
        lg: "0 26px 60px -28px rgba(17, 20, 24, 0.36)",
        luxe: "0 30px 80px -40px rgba(6, 12, 20, 0.8)",
        glow: "0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px -35px rgba(24, 196, 145, 0.6)",
        soft: "0 18px 50px -40px rgba(12, 18, 26, 0.35)",
      },
      backgroundImage: {
        "radial-glow":
          "radial-gradient(1200px 600px at 10% -10%, rgba(57, 214, 166, 0.25), transparent 60%), radial-gradient(900px 600px at 90% 10%, rgba(42, 76, 255, 0.2), transparent 55%)",
        "dark-glow":
          "radial-gradient(1200px 700px at 15% -10%, rgba(57, 214, 166, 0.18), transparent 60%), radial-gradient(900px 700px at 80% 0%, rgba(233, 193, 106, 0.12), transparent 55%)",
        "glass-sheen":
          "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))",
      },
      keyframes: {
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-16px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(24px)" },
          "100%": { opacity: 1, transform: "translateY(0px)" },
        },
      },
      animation: {
        floatSlow: "floatSlow 10s ease-in-out infinite",
        shimmer: "shimmer 8s ease-in-out infinite",
        fadeUp: "fadeUp 0.8s cubic-bezier(0.2, 0.65, 0.3, 1) both",
      },
    },
  },
  plugins: [],
}
