import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#e8f0fb', 500:'#1565C0', 600:'#0F4C91', 700:'#0F3460' },
        ops: { green:'#1B7F4F', amber:'#E07B12', red:'#C0392B' },
      },
    },
  },
  plugins: [],
}
export default config
