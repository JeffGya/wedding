/**
 * HTML Template utilities and theme system using UnoCSS design tokens
 */

export const EMAIL_THEMES = {
  'elegant': {
    name: 'Elegant',
    description: 'Sophisticated design with serif fonts and gold accents',
    colors: {
      primary: 'var(--int-base)', // #442727 (Mahogany)
      secondary: 'var(--acc2-base)', // #D2C6B2 (Beige)
      accent: 'var(--acc-base)', // #DAA520 (Gold)
      background: 'var(--bg-gradient)', // Linear gradient
      text: 'var(--text)', // #0F0F0F
      cardBg: 'var(--card-bg)' // #E9E7D9
    },
    fonts: {
      heading: 'Great Vibes, cursive',
      body: 'Lora, serif'
    }
  },
  'modern': {
    name: 'Modern',
    description: 'Clean, minimalist design with sans-serif fonts',
    colors: {
      primary: 'var(--int-base)', // #442727
      secondary: 'var(--acc2-base)', // #D2C6B2
      accent: 'var(--acc-base)', // #DAA520
      background: 'var(--form-background)', // #F1EFE8
      text: 'var(--text)', // #0F0F0F
      cardBg: 'var(--card-bg)' // #E9E7D9
    },
    fonts: {
      heading: 'Open Sans, sans-serif',
      body: 'Open Sans, sans-serif'
    }
  },
  'romantic': {
    name: 'Romantic',
    description: 'Soft, romantic design with cursive fonts',
    colors: {
      primary: 'var(--int-base)', // #442727
      secondary: 'var(--acc2-base)', // #D2C6B2
      accent: 'var(--acc-base)', // #DAA520
      background: 'var(--bg-glass)', // Glass effect
      text: 'var(--text)', // #0F0F0F
      cardBg: 'var(--card-bg)' // #E9E7D9
    },
    fonts: {
      heading: 'Great Vibes, cursive',
      body: 'Lora, serif'
    }
  },
  'casual': {
    name: 'Casual',
    description: 'Friendly, approachable design',
    colors: {
      primary: 'var(--int-base)', // #442727
      secondary: 'var(--acc2-base)', // #D2C6B2
      accent: 'var(--acc-base)', // #DAA520
      background: 'var(--form-background)', // #F1EFE8
      text: 'var(--text)', // #0F0F0F
      cardBg: 'var(--card-bg)' // #E9E7D9
    },
    fonts: {
      heading: 'Open Sans, sans-serif',
      body: 'Open Sans, sans-serif'
    }
  }
}

/**
 * Generate HTML template from text content using UnoCSS design tokens
 */
export function generateHtmlFromText(textContent, theme = 'elegant') {
  const themeData = EMAIL_THEMES[theme]
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wedding Invitation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Lora:wght@400;500;700&family=Open+Sans:wght@400;500;600;700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      font-family: ${themeData.fonts.body};
      line-height: 1.6;
      color: ${themeData.colors.text};
      background: ${themeData.colors.background};
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 32px 16px;
    }
    .email-content {
      background: ${themeData.colors.cardBg};
      border-radius: 24px;
      padding: 48px 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      border: 1px solid var(--form-border);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid var(--form-border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .couple-names {
      font-family: ${themeData.fonts.heading};
      font-size: 48px;
      color: ${themeData.colors.primary};
      font-weight: 400;
      margin-bottom: 16px;
      line-height: 1.2;
    }
    .wedding-date {
      font-size: 18px;
      color: ${themeData.colors.secondary};
      font-style: italic;
      font-family: ${themeData.fonts.body};
    }
    .cta-button {
      display: inline-block;
      background: ${themeData.colors.accent};
      color: ${themeData.colors.primary};
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 40px;
      font-weight: 600;
      margin: 24px 0;
      text-align: center;
      font-family: ${themeData.fonts.body};
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(218, 165, 32, 0.3);
    }
    .cta-button:hover {
      background: var(--acc-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(218, 165, 32, 0.4);
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--form-border);
      color: ${themeData.colors.secondary};
      font-size: 14px;
      font-family: ${themeData.fonts.body};
    }
    .content {
      font-size: 16px;
      line-height: 1.8;
      font-family: ${themeData.fonts.body};
      color: ${themeData.colors.text};
    }
    .content p {
      margin-bottom: 16px;
    }
    .rsvp-link {
      color: ${themeData.colors.accent};
      text-decoration: none;
      font-weight: 600;
    }
    .rsvp-link:hover {
      color: var(--acc-hover);
      text-decoration: underline;
    }
    .conditional-section {
      background: var(--form-background);
      border-left: 4px solid ${themeData.colors.accent};
      padding: 16px;
      margin: 16px 0;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-content">
      <div class="header">
        <div class="couple-names">Brigita & Jeffrey</div>
        <div class="wedding-date">{{weddingDate}}</div>
      </div>
      
      <div class="content">
        ${convertTextToHtml(textContent)}
      </div>
      
      <div class="footer">
        <p>Best regards,<br>Brigita & Jeffrey</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Convert plain text to HTML paragraphs with UnoCSS styling
 */
function convertTextToHtml(text) {
  return text
    .split('\n\n')
    .map(paragraph => {
      if (paragraph.trim()) {
        // Handle conditional sections
        if (paragraph.includes('{{#if')) {
          return `<div class="conditional-section">${paragraph.trim()}</div>`
        }
        return `<p>${paragraph.trim()}</p>`
      }
      return ''
    })
    .join('\n')
}

/**
 * Check if template has HTML version
 */
export function hasHtmlVersion(template) {
  return template.html && template.html.trim().length > 0
}

/**
 * Get template preview (HTML or text)
 */
export function getTemplatePreview(template, preferHtml = true) {
  if (preferHtml && hasHtmlVersion(template)) {
    return template.html
  }
  return template.body_en || template.body_lt
}

/**
 * Get theme data
 */
export function getThemeData(themeName) {
  return EMAIL_THEMES[themeName] || EMAIL_THEMES['elegant']
}

/**
 * Get all available themes
 */
export function getAllThemes() {
  return Object.keys(EMAIL_THEMES)
} 