import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-140px)' },
          '50%': { transform: 'translateY(140px)' },
          '100%': { transform: 'translateY(-140px)' },
        },
      },
      animation: {
        'scan': 'scan 3s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
