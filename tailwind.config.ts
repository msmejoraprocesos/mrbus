import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e8f0fb',
          100: '#c5d6f5',
          500: '#1565C0',
          600: '#0F4C91',
          700: '#0F3460',
          900: '#071a38',
        },
        ops: {
          green:  '#1B7F4F',
          amber:  '#E07B12',
          red:    '#C0392B',
          blue:   '#1565C0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
