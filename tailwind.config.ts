import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0A7EA4',
        accent: '#12B886',
        dark: '#1A1A2E',
      },
    },
  },
  plugins: [],
}
export default config
