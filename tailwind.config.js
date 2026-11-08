/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          cream: '#faf5e8',
        },
        onyx: '#181d26',
        pureWhite: '#ffffff',
        frostWhite: '#f8fafc',
        charcoal: '#333840',
        graphite: '#525965',
        steel: '#9297a0',
        silverBorder: '#e0e2e6',
        midnightIndigo: '#040e20',
        cobaltBlue: '#1b61c9',
        sapphire: '#254fad',
        terracotta: '#aa2d00',
        burntSienna: '#912e1f',
        peachGlow: '#fcab79',
        forestInk: '#0a2e0e',
        moss: '#214224',
        petalPink: '#fa91e0',
        marigold: '#fcb42a',
        paleSky: '#c7e5f2',
      },
      fontFamily: {
        display: ['"Roboto Slab"', 'Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        tags: '32px',
        cards: '16px',
        buttons: '12px',
        featurecards: '24px',
      },
      boxShadow: {
        subtle: 'rgba(0, 0, 0, 0.32) 0px 0px 1px 0px, rgba(0, 0, 0, 0.08) 0px 0px 2px 0px, rgba(45, 127, 249, 0.28) 0px 1px 3px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 0.5px inset',
        header: 'rgba(15, 48, 106, 0.05) 0px 0px 20px 0px',
      },
      maxWidth: {
        page: '1200px',
      },
    },
  },
  plugins: [],
};
