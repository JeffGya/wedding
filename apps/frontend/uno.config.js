// uno.config.ts
import { defineConfig } from 'unocss'

export default defineConfig({
  // optional safelist for classes you use dynamically
  safelist: [],
  theme: {
    fontFamily: {
      cursive: "Great Vibes, cursive",
      serif: "Lora, serif",
      sans: "Open Sans, sans-serif",
    },
  },
  preflights: [
    {
      getCSS: () => `
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