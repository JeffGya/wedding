// uno.config.ts
import { defineConfig } from 'unocss'
import presetIcons from '@unocss/preset-icons'

export default defineConfig({
    presets: [
      presetIcons({
        collections: {
          solar: async () =>
            (await import('@iconify-json/solar/icons.json')).default,
          },
        prefix: 'i-',
      }),
    ],
  // optional safelist for classes you use dynamically
  safelist: [],
  theme: {
    fontFamily: {
      cursive: "Great Vibes, cursive",
      serif: "Lora, serif",
      sans: "Open Sans, sans-serif",
    },
    colors: {
      // Accent / Gold
      'accent-gold-base':    '#DAA520',
      'accent-gold-active':  '#C2901E',
      'accent-gold-pressed': '#A47A1B',
      'accent-gold-hover':   '#E3B13F',
      // Accent / Cream
      'accent-cream-base':    '#D2C6B2',
      'accent-cream-active':  '#BFB6A3',
      'accent-cream-pressed': '#ABA38D',
      'accent-cream-hover':   '#DED4C4',
      // Interactive / Light
      'interactive-light-base':    '#442727',
      'interactive-light-active':  '#3B1E1E',
      'interactive-light-pressed': '#2E1A1A',
      'interactive-light-hover':   '#5A3A3A',
      // Interactive / Dark
      'interactive-dark-base':    '#927D14',
      'interactive-dark-active':  '#846C12',
      'interactive-dark-pressed': '#69550F',
      'interactive-dark-hover':   '#A68626',

      // Interactive-Background
      'int-base':    'var(--int-base)',
      'int-active':  'var(--int-active)',
      'int-pressed': 'var(--int-pressed)',
      'int-hover':   'var(--int-hover)',

      // Accent-Background
      'ac-base':    'var(--acc-base)',
      'ac-active':  'var(--acc-active)',
      'ac-pressed': 'var(--int-pressed)',
      'ac-hover':   'var(--acc-hover)',

      // Background Gradient
      'bg-gradient': 'var(--bg-gradient)',

      // Interactive-Text
      'int-text':    'var(--int-text)',
      
      // Text
      'txt': 'var(--text)',
    },
    // Spacing scale (8px increments, 0.5rem–2.5rem)
    spacing: {
      '8':  '0.5rem',   //  8px
      '16': '1rem',     // 16px
      '24': '1.5rem',   // 24px
      '32': '2rem',     // 32px
      '40': '2.5rem',   // 40px
    },
    // Typography scale placeholder
    fontSize: {
      'sm':   '0.875rem',   // 14px
      'base': '1rem',       // 16px
      'lg':   '1.125rem',   // 18px
      'xl':   '1.25rem',    // 20px
      '2xl':  '1.5rem',     // 24px
      '3xl':  '1.875rem',   // 30px
      '4xl':  '2.25rem',    // 36px
      '5xl':  '3rem',       // 48px
    },
    // Border radii
    borderRadius: {
      'sm': '0.25rem',  // 4px
      'md': '0.5rem',   // 8px
    },
    // Responsive breakpoints
    breakpoints: {
      'sm':  '640px',
      'md':  '768px',
      'lg':  '1024px',
      'xl':  '1280px',
      '2xl': '1536px',
    },
    // Opacity levels
    opacity: {
      '50': '0.5',
      '75': '0.75',
    },
  },
  preflights: [
    {
      getCSS: () => `
        /* Light mode variables */
        :root {
          /* Background Glass */
          --bg-glass: linear-gradient(to right bottom, #E9E7D980, #D2C6B260);
          --bg-glass-border: #E9E7D910;

          /* Background Gradient */
          --bg-gradient: linear-gradient(to right bottom, #D2C6B2, #E3B13F, #927D14);

          /* Interactive Background Mahogany */
          --int-base: #442727;
          --int-active: #3B1E1E;
          --int-pressed: #2E1A1A;
          --int-hover: #5A3A3A;

          --acc-base: #DAA520;
          --acc-active: #C2901E;
          --acc-pressed: #A47A1B;
          --acc-hover: #E3B13F;
          
          /* Interactive Text */
          --int-text: #D2C6B2;
          
          /* Text color */
          --text: #0F0F0F;
        }
        /* Dark mode overrides */
        .dark-mode {
          /* Background Gradient */
          --bg-gradient: linear-gradient(to right bottom, #0f0f0f, #2E1A1A, #442727);

          /* Interactive Background Gold */
          --int-base: #DAA520;
          --int-active: #C2901E;
          --int-pressed: #A47A1B;
          --int-hover: #E3B13F;

          --acc-base: #D2C6B2;
          --acc-active: #BFB6A3;
          --acc-pressed: #ABA38D;
          --acc-hover: #DED4C4;

          /* Ineractive Text */
          --int-text: #442727;

          /* Text color */
          --text: #E9E7D9;
        }
        /* Font Faces */
        @font-face {
          font-family: 'Great Vibes';
          font-style: normal;
          font-weight: 400;
          src: url('/fonts/GreatVibes/GreatVibes-Regular.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Lora';
          font-style: normal;
          font-weight: 400;
          src: url('/fonts/Lora/Lora-Regular.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Lora';
          font-style: medium;
          font-weight: 700;
          src: url('/fonts/Lora/Lora-Medium.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Lora';
          font-style: bold;
          font-weight: 700;
          src: url('/fonts/Lora/Lora-Bold.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Open Sans';
          font-style: normal;
          font-weight: 400;
          src: url('/fonts/OpenSans/OpenSans-Regular.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Open Sans';
          font-style: bold;
          font-weight: 700;
          src: url('/fonts/OpenSans/OpenSans-Bold.ttf') format('truetype');
        }
      `,
    },
  ],
  rules: [],
})