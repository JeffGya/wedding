/**
 * Email Template System
 * Provides configurable email templates with consistent styling
 */

const fs = require('fs');
const path = require('path');

// Read SVG logo from external file and add size constraints
let svgLogo = '';
try {
  const rawSvg = fs.readFileSync(
    path.join(__dirname, 'wedding-logo.svg'), 
    'utf8'
  );
  // Add size constraints to the SVG
  svgLogo = rawSvg.replace(
    '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 928.06 899.01">',
    '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 928.06 899.01" width="120" height="116" style="max-width: 120px; max-height: 116px;">'
  );
} catch (error) {
  const logger = require('../helpers/logger');
  logger.warn('Warning: Could not load wedding-logo.svg, using placeholder');
  svgLogo = '<!-- SVG Logo Placeholder -->';
}

const EMAIL_TEMPLATES = {
  elegant: {
    name: 'Elegant',
    description: 'Sophisticated design with serif fonts and pronounced borders',
    header: {
      background: 'linear-gradient(135deg, #DAA52080 0%, #E3B13F60 50%, #DAA52080 100%)',
      border: '2px solid #E3B13F40',
      titleFont: "'Great Vibes', cursive",
      titleSize: '42px',
      titleColor: '#442727'
    },
    content: {
      background: '#E9E7D9',
      boxShadow: '0 6px 20px rgba(68, 39, 39, 0.2)',
      bodyFont: "'Lora', serif",
      bodySize: '16px',
      lineHeight: '1.6'
    },
    button: {
      background: '#442727',
      textColor: '#DAA520',
      font: "'Open Sans', sans-serif",
      fontSize: '16px',
      fontWeight: '600',
      borderRadius: '8px',
      padding: '12px 24px'
    },
    footer: {
      background: 'linear-gradient(135deg, #DAA52080 0%, #E3B13F60 50%, #DAA52080 100%)',
      border: '2px solid #E3B13F40',
      font: "'Lora', serif",
      fontSize: '16px'
    }
  },
  modern: {
    name: 'Modern',
    description: 'Clean, minimalist design with sans-serif fonts',
    header: {
      background: 'linear-gradient(135deg, #DAA52080 0%, #E3B13F60 50%, #DAA52080 100%)',
      border: '1px solid #E3B13F20',
      titleFont: "'Great Vibes', cursive",
      titleSize: '42px',
      titleColor: '#442727'
    },
    content: {
      background: '#F1EFE8',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      bodyFont: "'Open Sans', sans-serif",
      bodySize: '16px',
      lineHeight: '1.5'
    },
    button: {
      background: '#442727',
      textColor: '#DAA520',
      font: "'Open Sans', sans-serif",
      fontSize: '16px',
      fontWeight: '600',
      borderRadius: '8px',
      padding: '12px 24px'
    },
    footer: {
      background: 'linear-gradient(135deg, #DAA52080 0%, #E3B13F60 50%, #DAA52080 100%)',
      border: '1px solid #E3B13F20',
      font: "'Open Sans', sans-serif",
      fontSize: '16px'
    }
  },
  friendly: {
    name: 'Friendly',
    description: 'Warm, approachable design with glass effects',
    header: {
      background: 'linear-gradient(135deg, #DAA52080 0%, #E3B13F60 50%, #DAA52080 100%)',
      border: '1px solid #E3B13F20',
      titleFont: "'Great Vibes', cursive",
      titleSize: '42px',
      titleColor: '#DAA520'
    },
    content: {
      background: 'linear-gradient(to right bottom, #E9E7D980, #D2C6B260)',
      boxShadow: 'none',
      bodyFont: "'Open Sans', sans-serif",
      bodySize: '16px',
      lineHeight: '1.6'
    },
    button: {
      background: '#442727',
      textColor: '#DAA520',
      font: "'Open Sans', sans-serif",
      fontSize: '16px',
      fontWeight: '600',
      borderRadius: '8px',
      padding: '12px 24px'
    },
    footer: {
      background: 'linear-gradient(135deg, #DAA52080 0%, #E3B13F60 50%, #DAA52080 100%)',
      border: '1px solid #E3B13F20',
      font: "'Open Sans', sans-serif",
      fontSize: '16px'
    }
  }
};

/**
 * Generate complete email HTML with header, content, and footer
 */
function generateEmailHTML(content, style = 'elegant', options = {}) {
  const config = EMAIL_TEMPLATES[style] || EMAIL_TEMPLATES.elegant;
  const {
    title = 'Brigtia & Jeffrey',
    buttonText,
    buttonUrl,
    footerText = 'With love and joy,',
    siteUrl = 'https://your-wedding-site.com'
  } = options;

  // Check if buttonText or buttonUrl are explicitly set to null/undefined/false
  const shouldShowButton = buttonText && buttonUrl && buttonText !== null && buttonUrl !== null;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wedding Invitation</title>
  <style>
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding: 15px !important; }
      .mobile-text { font-size: 14px !important; }
      .mobile-button { padding: 10px 20px !important; }
      .mobile-header { padding: 20px 15px !important; }
      .mobile-content { padding: 30px 20px !important; }
      .mobile-footer { padding: 20px 15px !important; }
      .mobile-title { font-size: 28px !important; }
      .mobile-logo { width: 80px !important; height: 77px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1EFE8; font-family: Arial, Helvetica, sans-serif;">
  
  <!-- Main Container Table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F1EFE8;">
    <tr>
      <td align="center" style="padding: 20px;">
        
        <!-- Email Content Table -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width: 600px; background-color: #F1EFE8;">
          
          <!-- Header -->
          <tr>
            <td class="mobile-header" style="padding: 30px 25px; background: ${config.header.background}; border: ${config.header.border}; border-radius: 12px 12px 0 0; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="text-align: center;">
                    <div style="margin-bottom: 20px;">
                      ${svgLogo}
                    </div>
                    <h1 class="mobile-title" style="margin: 0; font-family: ${config.header.titleFont}; font-size: ${config.header.titleSize}; color: ${config.header.titleColor}; font-weight: normal;">
                      ${title}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="mobile-content" style="padding: 40px 30px; background: ${config.content.background}; box-shadow: ${config.content.boxShadow};">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="mobile-text" style="font-family: ${config.content.bodyFont}; font-size: ${config.content.bodySize}; line-height: ${config.content.lineHeight}; color: #442727;">
                    ${content}
                  </td>
                </tr>
                ${shouldShowButton ? `
                <tr>
                  <td style="text-align: center; padding-top: 30px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td class="mobile-button" style="background: ${config.button.background}; border-radius: ${config.button.borderRadius}; padding: ${config.button.padding}; text-align: center;">
                          <a href="${buttonUrl}" style="font-family: ${config.button.font}; font-size: ${config.button.fontSize}; font-weight: ${config.button.fontWeight}; color: ${config.button.textColor}; text-decoration: none; display: inline-block;">
                            ${buttonText}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="mobile-footer" style="padding: 25px; background: ${config.footer.background}; border: ${config.footer.border}; border-radius: 0 0 12px 12px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="mobile-text" style="font-family: ${config.footer.font}; font-size: ${config.footer.fontSize}; color: #442727; line-height: 1.6;">
                    <p style="margin: 0 0 10px 0;">
                      ${footerText}
                    </p>
                    <p style="margin: 0 0 15px 0; font-weight: bold;">
                      Brigtia & Jeffrey
                    </p>
                    <p style="margin: 0; font-size: 14px;">
                      <a href="${siteUrl}" style="color: #DAA520; text-decoration: none;">
                        ${siteUrl}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>`;
}

/**
 * Generate button HTML for use in templates
 */
function generateButtonHTML(text, url, style = 'elegant') {
  const config = EMAIL_TEMPLATES[style] || EMAIL_TEMPLATES.elegant;
  
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
    <tr>
      <td style="background: ${config.button.background}; border-radius: ${config.button.borderRadius}; padding: ${config.button.padding}; text-align: center;">
        <a href="${url}" style="font-family: ${config.button.font}; font-size: ${config.button.fontSize}; font-weight: ${config.button.fontWeight}; color: ${config.button.textColor}; text-decoration: none; display: inline-block;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

/**
 * Get available email styles
 */
function getAvailableStyles() {
  return Object.keys(EMAIL_TEMPLATES).map(key => ({
    key,
    ...EMAIL_TEMPLATES[key]
  }));
}

/**
 * Get template configuration for a specific style
 */
function getTemplateConfig(style) {
  return EMAIL_TEMPLATES[style] || EMAIL_TEMPLATES.elegant;
}

module.exports = {
  generateEmailHTML,
  generateButtonHTML,
  getAvailableStyles,
  getTemplateConfig,
  EMAIL_TEMPLATES
};
