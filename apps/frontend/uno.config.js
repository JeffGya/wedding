// uno.config.ts
import { defineConfig } from 'unocss'
import presetUno from '@unocss/preset-uno'
import presetIcons from '@unocss/preset-icons'
import { transformerDirectives, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      collections: {
        solar: async () =>
          (await import('@iconify-json/solar/icons.json')).default,
      },
      prefix: 'i-',
    }),
  ],
  
  // Add this section
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
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
      // Button tokens
      'btn-primary-base':    'var(--btn--primary--base)',
      'btn-primary-hover':   'var(--btn--primary--hover)',
      'btn-primary-active':  'var(--btn--primary--active)',
      'btn-secondary-base':  'var(--btn--secondary--base)',
      'btn-secondary-hover': 'var(--btn--secondary--hover)',
      'btn-secondary-active':'var(--btn--secondary--active)',

      // Text tokens
      'txt':      'var(--text)',
      'int-text': 'var(--int-text)',

      // Accent background
      'ac-base':   'var(--acc-base)',
      'ac-hover':  'var(--acc-hover)',
      'ac-active': 'var(--acc-active)',

      // Accent 2 background
      'ac2-base':   'var(--acc2-base)',
      'ac2-hover':  'var(--acc2-hover)',
      'ac2-active': 'var(--acc2-active)',

      // Interactive background
      'int-base':   'var(--int-base)',
      'int-hover':  'var(--int-hover)',
      'int-active': 'var(--int-active)',

      // Background gradient
      'bg-gradient': 'var(--bg-gradient)',

      // Form field tokens
      'form-placeholder-text': 'var(--form-placeholder-text)',

      'form-bg': 'var(--form-background)',
      'form-bg-hover': 'var(--form-background-hover)',
      'form-bg-focus': 'var(--form-background-focus)',
      
      // Form field border tokens
      'form-border': 'var(--form-border)',
      'form-border-focus': 'var(--form-border-focus)',

      // Button text tokens
      'btn-primary-text':   'var(--btn--primary--text)',
      'btn-secondary-text': 'var(--btn--secondary--text)',
      
      // Header and special text
      'text-header':         'var(--txt-header)',

      // Card background
      'card-bg': 'var(--card-bg)',
      
      // Background glass
      'bg-glass': 'var(--bg-glass)',
      'bg-glass-border': 'var(--bg-glass-border)',
    },
    // Spacing scale (8px increments, 0.5rem–2.5rem)
    spacing: {
      '2':  '0.125rem', //  2px
      '4':  '0.25rem',  //  4px
      '8':  '0.5rem',   //  8px
      '16': '1rem',     // 16px
      '24': '1.5rem',   // 24px
      '32': '2rem',     // 32px
      '40': '2.5rem',   // 40px
      '48': '3rem',     // 48px
      '64': '4rem',     // 64px
      '80': '5rem',     // 80px
      '96': '6rem',     // 96px
      '128': '8rem',    // 128px
      '160': '10rem',   // 160px
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
      'sm': '0.5rem',  // 4px
      'md': '1rem',   // 16px
      'lg': '1.5rem',  // 24px
      'xl': '2.5rem',     // 40px
    },
    // Responsive breakpoints
    breakpoints: {
      'sm':  '640px',
      'md':  '768px',
      'lg':  '1024px',
      'xl':  '1280px'
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
          --bg-glass-border: #E9E7D925;

          /* Background Gradient */
          --bg-color: #DAA520;
          --bg-gradient: linear-gradient(to right bottom, #D2C6B280, #927D1480);

          /* Interactive Background Mahogany */
          --int-base: #442727;
          --int-active: #3B1E1E;
          --int-hover: #5A3A3A;

          --acc-base: #DAA520;
          --acc-active: #C2901E;
          --acc-hover: #E3B13F;

          --acc2-base: #D2C6B2;
          --acc2-active: #BFB6A3;
          --acc2-hover: #DED4C4;
          
          /* Interactive Text */
          --int-text: #D2C6B2;
          
          /* Text color */
          --text: #0F0F0F;

          /* Header/special text */
          --txt-header:            var(--btn--primary--base);

          /* Form field colors (light mode) */
          --form-placeholder-text: #A0A0A0;

          --form-background: #F1EFE8;
          --form-background-hover: #DED4C4;
          --form-background-focus: #BFB6A3;

          /* Form field border (light mode) */
          --form-border: #DED4C4;
          --form-border-hover: #ABA38D;
          --form-border-focus: #DAA520;

          /* Card background */
          --card-bg: #E9E7D9;
        }

        /* Dark mode overrides */
        .dark-mode {
          /* Background Glass */
          --bg-glass: linear-gradient(to right bottom, #C2901E80, #A47A1B60);
          --bg-glass-border: #E3B13F10;

          /* Background Gradient */
          --bg-color: #442727;
          --bg-gradient: linear-gradient(to right bottom, #0f0f0f, #2E1A1A, #442727);

          /* Interactive Background Gold */
          --int-base: #DAA520;
          --int-active: #C2901E;
          --int-hover: #E3B13F;

          --acc-base: #D2C6B2;
          --acc-active: #BFB6A3;
          --acc-hover: #DED4C4;

          --acc2-base: #442727;
          --acc2-active: #3B1E1E;
          --acc2-hover: #5A3A3A;

          /* Ineractive Text */
          --int-text: #442727;

          /* Text color */
          --text: var(--acc-base);

          /* Header/special text */
          --txt-header:   var(--btn--primary--base);

          /* Form field colors*/
          --form-placeholder-text: #ABA38D;

          --form-background: #3B1E1E;
          --form-background-hover: #2E1A1A;
          --form-background-focus: #3B2525;

          /* Form field border */
          --form-border: #5A3A3A;
          --form-border-hover: #442727;
          --form-border-focus: #DAA520;

          /* Card background */
          --card-bg: #442727;
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
          font-style: normal;
          font-weight: 500;
          src: url('/fonts/Lora/Lora-Medium.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Lora';
          font-style: normal;
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
          font-style: normal;
          font-weight: 500;
          src: url('/fonts/OpenSans/OpenSans-Medium.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Open Sans';
          font-style: normal;
          font-weight: 600;
          src: url('/fonts/OpenSans/OpenSans-SemiBold.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Open Sans';
          font-style: normal;
          font-weight: 700;
          src: url('/fonts/OpenSans/OpenSans-Bold.ttf') format('truetype');
        }
      `,
    },
  ],
  rules: [],
})