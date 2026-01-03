/**
 * Email Template System
 * Provides configurable email templates with consistent styling
 */

const fs = require('fs');
const path = require('path');
const logger = require('../helpers/logger');

// Cache for loaded logo HTML
let logoHtmlCache = null;

/**
 * Load logo HTML with fallback chain: PNG → SVG → text
 * This is lazy-loaded when needed, not at module load time
 * @returns {string} HTML string for the logo
 */
function loadLogoHtml() {
  // Return cached value if available
  if (logoHtmlCache !== null) {
    return logoHtmlCache;
  }

  try {
    // First try to load the PNG logo for maximum email compatibility
    const pngPath = path.join(__dirname, 'Logo.png');
    if (fs.existsSync(pngPath)) {
      const pngBuffer = fs.readFileSync(pngPath);
      const base64Png = pngBuffer.toString('base64');
      logoHtmlCache = `<img src="data:image/png;base64,${base64Png}" alt="Wedding Logo" style="max-width: 80px; max-height: 80px; display: block; margin: 0 auto;">`;
      return logoHtmlCache;
    } else {
      throw new Error('PNG logo not found');
    }
  } catch (error) {
    try {
      // Fallback to SVG with proper sizing (similar to PNG dimensions)
      const rawSvg = fs.readFileSync(
        path.join(__dirname, 'wedding-logo.svg'), 
        'utf8'
      );
      // Size the SVG to match the PNG dimensions (120x116)
      logoHtmlCache = rawSvg.replace(
        '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 928.06 899.01">',
        '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 928.06 899.01" width="80 " height="80" style="max-width: 80px; max-height: 80px;">'
      );
      return logoHtmlCache;
    } catch (svgError) {
      // Final fallback to text logo
      logger.warn('Could not load any logo, using text fallback');
      logoHtmlCache = '<div style="font-family: \'Great Vibes\', cursive; font-size: 32px; color: #442727; margin-bottom: 20px;">Brigita & Jeffrey</div>';
      return logoHtmlCache;
    }
  }
}

const EMAIL_TEMPLATES = {
  elegant: {
    name: 'Elegant',
    description: 'Premium design with cursive titles, sans body, optional header image, and signature footer',
    header: {
      background: '#E9E7D9',
      border: '2px solid #D2C6B2',
      titleFont: "'Great Vibes', Georgia, serif",
      titleSize: '42px',
      titleColor: '#442727'
    },
    content: {
      background: '#E9E7D9',
      boxShadow: 'none',
      bodyFont: "'Open Sans', Arial, sans-serif",
      bodySize: '16px',
      lineHeight: '1.7'
    },
    button: {
      // Gold-filled with high contrast for accessibility
      background: '#DAA520',
      textColor: '#442727',
      border: '2px solid #442727',
      font: "'Open Sans', Arial, Helvetica, sans-serif",
      fontSize: '16px',
      fontWeight: '700',
      borderRadius: '6px',
      padding: '14px 28px'
    },
    footer: {
      background: '#E9E7D9',
      border: '2px solid #D2C6B2',
      font: "'Lora', Georgia, 'Times New Roman', serif",
      fontSize: '16px',
      signatureFont: "'Great Vibes', 'Brush Script MT', 'Lucida Handwriting', cursive, Georgia, 'Times New Roman', serif",
      signatureSize: '88px'
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
 * Extract header image URL from content marker and return cleaned content
 * Marker format: <!--HEADER_IMAGE:https://...-->
 */
function extractHeaderImage(content) {
  const headerImageRegex = /<!--HEADER_IMAGE:(.*?)-->/;
  const match = content.match(headerImageRegex);
  
  if (match) {
    return {
      headerImageUrl: match[1].trim(),
      cleanedContent: content.replace(headerImageRegex, '').trim()
    };
  }
  
  return {
    headerImageUrl: null,
    cleanedContent: content
  };
}

/**
 * Extract custom email title from content marker and return cleaned content
 * Marker format: <!--EMAIL_TITLE:Custom Title Here-->
 */
function extractEmailTitle(content) {
  const titleRegex = /<!--EMAIL_TITLE:(.*?)-->/;
  const match = content.match(titleRegex);
  
  if (match) {
    return {
      customTitle: match[1].trim(),
      cleanedContent: content.replace(titleRegex, '').trim()
    };
  }
  
  return {
    customTitle: null,
    cleanedContent: content
  };
}

/**
 * Calculate dynamic font size for title based on title length
 * @param {string} title - The title text
 * @returns {number} Calculated font size in pixels
 */
function calculateTitleFontSize(title) {
  const titleLength = title.length;
  const availableWidth = 600; // Full container width
  const minSize = 64; // Minimum size for very long titles
  const maxSize = 100; // Maximum size for very short titles
  
  // Estimate character width for cursive font Great Vibes
  // Great Vibes is a flowing cursive font that takes significantly more horizontal space
  // Target: text should be ~125% of available width to ensure visible clipping
  const targetWidth = availableWidth * 1.25; // 125% of width for proper clipping
  const estimatedCharWidth = 0.70; // Increased to 0.70 to account for Great Vibes very wide rendering
  const calculatedSize = Math.floor((targetWidth / titleLength) / estimatedCharWidth);
  
  // Use the calculated size directly, only clamp to reasonable bounds
  return Math.max(minSize, Math.min(maxSize, calculatedSize));
}

/**
 * Generate the definitive email template with optional header image and signature footer
 */
function generateDefinitiveEmailHTML(content, options = {}) {
  const config = EMAIL_TEMPLATES.elegant;
  const {
    title = 'Brigita & Jeffrey',
    buttonText,
    buttonUrl,
    footerText = 'With love and joy,',
    siteUrl = 'https://your-wedding-site.com'
  } = options;

  // Extract header image if present
  const { headerImageUrl, cleanedContent: contentAfterImage } = extractHeaderImage(content);
  
  // Extract custom title if present
  const { customTitle, cleanedContent } = extractEmailTitle(contentAfterImage);
  
  // Use custom title from marker, or fall back to options title
  const displayTitle = customTitle || title;
  
  // Calculate dynamic font size using helper function
  const titleFontSize = calculateTitleFontSize(displayTitle);
  
  // Check if button markers exist in content (user explicitly added button via rich text editor)
  // Buttons should ONLY show when explicitly added via button markers in content, never from options
  // Note: If markers are already converted to HTML, they're in cleanedContent, so buttonRow is not needed
  // Never show buttonRow - buttons should only come from content (markers or HTML)
  const shouldShowButton = false;

  // Header image row (cover-style, fixed height) with title overlay if present
  const headerImageRow = headerImageUrl ? `
          <!-- Header Image (Cover) with Title Overlay -->
          <tr>
            <td style="padding: 0; line-height: 0; position: relative; overflow: hidden;">
              <div class="header-image-container" style="width: 100%; height: ${120 + Math.ceil(titleFontSize * 1.5) + 32}px; position: relative; background-color: #E9E7D9;">
                <!-- Image container (200px, allows 32px overlap for title) -->
                <div class="header-image" style="width: 100%; height: 200px; overflow: hidden; background-color: #D2C6B2; position: relative;">
                  <img 
                    src="${headerImageUrl}" 
                    alt="Header" 
                    width="600" 
                    style="width: 100%; height: 200px; object-fit: cover; display: block; border: 0;"
                  />
                </div>
                <!-- Title overlay on bottom of image (32px overlap, NO padding for proper clipping) -->
                <!-- Height multiplier 1.5 works for both Great Vibes and fallback fonts -->
                <div class="title-overlay" style="position: absolute; top: 168px; left: -32px; right: -32px; overflow: hidden; z-index: 10; height: ${Math.ceil(titleFontSize * 1.5) + 32}px; width: calc(100% + 64px);">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
                    <tr>
                      <td style="text-align: center; padding: 0;">
                        <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="664" style="margin: 0 auto;">
                          <tr>
                            <td style="text-align: center; padding: 0 32px;">
                              <h1 class="mobile-title text-dark" style="margin: 0; padding: 0; font-family: 'Great Vibes', 'Brush Script MT', 'Lucida Handwriting', cursive, Georgia, 'Times New Roman', serif; font-size: ${titleFontSize}px; color: ${config.header.titleColor}; font-weight: normal; letter-spacing: 0.3px; white-space: nowrap; text-align: center; line-height: 1.3; display: inline-block;">
                                ${displayTitle}
                              </h1>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </td>
          </tr>
          <!-- Spacing after header image with title (16px to border) -->
          <tr>
            <td style="padding: 16px 0 0 0; height: 0; line-height: 0; font-size: 0;">
              &nbsp;
            </td>
          </tr>
  ` : '';

  // Gold-filled accessible CTA button
  const buttonRow = shouldShowButton ? `
                <tr>
                  <td style="text-align: center; padding-top: 30px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td class="mobile-button" style="background-color: ${config.button.background}; border: ${config.button.border}; border-radius: ${config.button.borderRadius}; padding: ${config.button.padding}; text-align: center; mso-padding-alt: 0;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="13%" strokecolor="#442727" strokeweight="2px" fillcolor="#DAA520">
                            <w:anchorlock/>
                            <center style="color:#442727;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${buttonText}</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${buttonUrl}" style="font-family: ${config.button.font}; font-size: ${config.button.fontSize}; font-weight: ${config.button.fontWeight}; color: ${config.button.textColor}; text-decoration: none; display: inline-block; line-height: 1;">
                            ${buttonText}
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
  ` : '';

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Wedding Invitation</title>
  <!-- Google Fonts - some email clients support this -->
  <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Lora:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* @font-face declarations for better email client support */
    @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Lora:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&display=swap');
    
    /* Font fallbacks for clients that block external fonts */
    /* Great Vibes fallback: Brush Script MT, Lucida Handwriting, then Georgia serif */
    /* Lora fallback: use Georgia serif */
    /* Open Sans fallback: use Arial sans-serif */
    /* Note: We try multiple methods (link tag, @import, @font-face) for maximum compatibility */
    
    /* Conservative styling approach: Values optimized to work for both Great Vibes and fallback fonts */
    /* - Title containers use 1.5x multiplier (middle ground between 1.3 for Great Vibes and 1.6 for fallbacks) */
    /* - Line-height: 1.3 works well for both font types */
    /* - Letter-spacing: 0.3px is tighter for fallbacks but acceptable for Great Vibes */
    /* - Signature height: 95px accommodates both font rendering differences */
    
    /* Apply Lora font to h2 and below headings with fallback */
    h2, h3, h4, h5, h6 {
      font-family: 'Lora', Georgia, 'Times New Roman', serif !important;
    }
    
    /* Reset styles for email clients */
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    
    /* Prevent dark mode color inversion on key elements */
    [data-ogsc] .email-bg { background-color: #F1EFE8 !important; }
    [data-ogsc] .card-bg { background-color: #E9E7D9 !important; }
    [data-ogsc] .text-dark { color: #442727 !important; }
    [data-ogsc] .btn-gold { background-color: #DAA520 !important; }
    
    /* Tablet breakpoint (768px and below) */
    @media screen and (max-width: 768px) {
      .email-container { max-width: 100% !important; }
      .mobile-content { padding: 24px 20px !important; }
      .mobile-header { padding: 24px 20px !important; }
      .mobile-footer { padding: 24px 20px !important; }
      /* Slightly larger title on tablets */
      .mobile-title { font-size: 48px !important; }
      /* Adjust header image for tablets */
      .header-image { height: 180px !important; }
      /* Responsive header image container height for tablets */
      /* Formula: 120 + (titleFontSize * 1.5) + 32, where titleFontSize = 48px on tablet */
      .header-image-container { height: 224px !important; }
      /* Adjust title overlay position for tablets (180px image - 32px overlap = 148px) */
      .title-overlay { top: 148px !important; height: 104px !important; }
      /* Keep signature consistent on tablets - close to desktop size */
      .mobile-signature { font-size: 80px !important; height: 92px !important; }
      .mobile-signature p { font-size: 80px !important; padding-top: 8px !important; }
      /* Constrain title tables on tablets */
      table[width="664"] { width: 100% !important; max-width: 100% !important; }
    }
    
    /* Mobile breakpoint (600px and below) - phones */
    @media screen and (max-width: 600px) {
      /* Match Friendly template's mobile approach for better control */
      .email-container { width: 100% !important; max-width: 100% !important; }
      /* Reduce outer padding on mobile for more content space */
      td[align="center"] { padding: 15px !important; }
      .mobile-padding { padding: 0 20px !important; }
      .mobile-text { font-size: 14px !important; }
      .mobile-button { padding: 10px 20px !important; }
      .mobile-header { padding: 20px 15px !important; }
      .mobile-content { padding: 30px 20px !important; }
      .mobile-footer { padding: 20px 15px !important; }
      /* Increase title font size for better mobile readability - override dynamic sizing */
      /* Override inline font-size styles for mobile */
      h1.mobile-title,
      .mobile-title,
      h1[class*="mobile-title"] { 
        font-size: 40px !important; 
        line-height: 1.3 !important; 
        letter-spacing: 0.2px !important;
      }
      /* Keep signature consistent across devices - larger font and height to prevent clipping */
      .mobile-signature { font-size: 72px !important; height: 90px !important; }
      .mobile-signature p { font-size: 72px !important; padding-top: 8px !important; }
      .header-image { height: 150px !important; }
      /* Responsive header image container height for mobile */
      /* Formula: 120 + (titleFontSize * 1.5) + 32, where titleFontSize = 40px on mobile */
      .header-image-container { height: 212px !important; }
      /* Adjust title overlay position for mobile (150px image - 32px overlap = 118px) */
      .title-overlay { top: 118px !important; height: 92px !important; }
      /* Ensure table cells don't stretch beyond viewport */
      table { max-width: 100% !important; table-layout: auto !important; }
      td { max-width: 100% !important; word-wrap: break-word !important; }
      /* Constrain title tables (664px) on mobile to prevent overflow */
      table[width="664"] { width: 100% !important; max-width: 100% !important; }
      table[width="664"] td { padding-left: 16px !important; padding-right: 16px !important; }
      /* Ensure content text wraps properly on mobile */
      .mobile-text { word-wrap: break-word !important; overflow-wrap: break-word !important; }
      /* Override fixed padding values on mobile */
      td[style*="padding: 0 30px"],
      td[style*="padding:0 30px"] { padding-left: 20px !important; padding-right: 20px !important; }
      td[style*="padding: 30px"],
      td[style*="padding:30px"] { padding: 30px 20px !important; }
      /* Make images responsive */
      img { max-width: 100% !important; height: auto !important; }
      /* Ensure buttons are touch-friendly */
      .mobile-button a { min-height: 44px !important; display: flex !important; align-items: center !important; justify-content: center !important; }
      /* Adjust title container heights for mobile - override dynamic sizing */
      /* Target title containers more specifically */
      .mobile-header div[style*="overflow: hidden"] {
        height: auto !important;
        min-height: 50px !important;
        max-height: 100px !important;
      }
      /* Adjust header image title overlay for mobile */
      div[style*="position: absolute"][style*="z-index: 10"] {
        height: auto !important;
        min-height: 70px !important;
        max-height: 130px !important;
      }
    }
    
    /* Small mobile breakpoint (480px and below) - small phones */
    @media screen and (max-width: 480px) {
      td[align="center"] { padding: 10px !important; }
      .mobile-content { padding: 24px 16px !important; }
      .mobile-header { padding: 16px 12px !important; }
      .mobile-footer { padding: 16px 12px !important; }
      .mobile-title { font-size: 36px !important; }
      .mobile-text { font-size: 13px !important; }
      /* Responsive header image container height for small mobile */
      /* Formula: 120 + (titleFontSize * 1.5) + 32, where titleFontSize = 36px on small mobile */
      .header-image-container { height: 206px !important; }
      /* Title overlay position same as mobile (150px image - 32px overlap = 118px) */
      .title-overlay { top: 118px !important; height: 86px !important; }
      /* Keep signature readable on small phones - still larger to prevent clipping */
      .mobile-signature { font-size: 68px !important; height: 88px !important; }
      .mobile-signature p { font-size: 68px !important; padding-top: 8px !important; }
    }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1EFE8; font-family: 'Open Sans', Arial, sans-serif;" class="email-bg">
  
  <!-- Main Container Table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F1EFE8;" class="email-bg">
    <tr>
      <td align="center" style="padding: 20px;">
        
        <!-- Email Content Table -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width: 600px; background-color: #E9E7D9; border: 2px solid #D2C6B2; border-radius: 8px;" class="card-bg">
          
          ${headerImageRow}
          
          <!-- Logo & Title Header (only if no header image) -->
          ${!headerImageUrl ? `
          <tr>
            <td class="mobile-header" style="padding: 0; background-color: #E9E7D9; text-align: center; overflow: hidden;" bgcolor="#E9E7D9">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="text-align: center; padding: 0;">
                    <!-- Title with top clipping (16px) and side clipping (32px each) - hits border -->
                    <!-- Height multiplier 1.5 works for both Great Vibes and fallback fonts -->
                    <div style="overflow: hidden; height: ${Math.ceil(titleFontSize * 1.5)}px; position: relative; margin-top: -16px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
                        <tr>
                          <td style="text-align: center; padding: 0;">
                            <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="664" style="margin: 0 auto;">
                              <tr>
                                <td style="text-align: center; padding: 0 32px;">
                                  <h1 class="mobile-title text-dark" style="margin: 0; padding: 0; font-family: 'Great Vibes', 'Brush Script MT', 'Lucida Handwriting', cursive, Georgia, 'Times New Roman', serif; font-size: ${titleFontSize}px; color: ${config.header.titleColor}; font-weight: normal; letter-spacing: 0.3px; white-space: nowrap; text-align: center; line-height: 1.3; display: inline-block;">
                                    ${displayTitle}
                                  </h1>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </div>
                    <!-- Logo below title -->
                    <div style="margin-top: 16px; margin-bottom: 16px;">
                      ${loadLogoHtml()}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Decorative Divider -->
          <tr>
            <td class="mobile-padding" style="padding: 0 30px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-bottom: 1px solid #D2C6B2; height: 1px; font-size: 1px; line-height: 1px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="mobile-content" style="padding: 30px; background-color: #E9E7D9;" bgcolor="#E9E7D9">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="mobile-text text-dark" style="font-family: 'Open Sans', Arial, Helvetica, sans-serif; font-size: ${config.content.bodySize}; line-height: ${config.content.lineHeight}; color: #442727;">
                    ${cleanedContent}
                  </td>
                </tr>
                ${buttonRow}
              </table>
            </td>
          </tr>
          
          <!-- Footer with Combined Greeting -->
          <tr>
            <td class="mobile-footer" style="padding: 24px 30px 0 30px; background-color: #E9E7D9; text-align: center;" bgcolor="#E9E7D9">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${headerImageUrl ? `
                <!-- Logo in footer (only if header image exists) -->
                <tr>
                  <td style="text-align: center; padding-bottom: 16px;">
                    ${loadLogoHtml()}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td class="mobile-text text-dark" style="font-family: 'Great Vibes', 'Brush Script MT', 'Lucida Handwriting', cursive, Georgia, 'Times New Roman', serif; font-size: 24px; color: #442727; line-height: 1.4; text-align: center;">
                    <p style="margin: 0; font-style: normal;">
                      ${footerText}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Oversized Signature Footer (Clipped / Out-of-Bounds Effect) -->
          <tr>
            <td style="padding: 0; background-color: #E9E7D9; overflow: hidden; margin-top: 0;" bgcolor="#E9E7D9">
              <!-- Height increased slightly to accommodate both Great Vibes and fallback fonts -->
              <div class="mobile-signature" style="height: 95px; overflow: hidden; text-align: center; position: relative;">
                <p style="margin: 0; padding-top: 10px; font-family: 'Great Vibes', 'Brush Script MT', 'Lucida Handwriting', cursive, Georgia, 'Times New Roman', serif; font-size: ${config.footer.signatureSize}; color: #442727; line-height: 1.1; white-space: nowrap; opacity: 0.85;">
                  Brigita &amp; Jeffrey
                </p>
              </div>
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
 * Generate complete email HTML with header, content, and footer
 * Unified function that handles all styles through the definitive template
 */
function generateEmailHTML(content, style = 'elegant', options = {}) {
  // All styles now use the definitive template (elegant style)
  // The style parameter is kept for backward compatibility but all styles render the same
  return generateDefinitiveEmailHTML(content, options);
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
  generateDefinitiveEmailHTML,
  generateButtonHTML,
  extractHeaderImage,
  extractEmailTitle,
  calculateTitleFontSize,
  loadLogoHtml,
  getAvailableStyles,
  getTemplateConfig,
  EMAIL_TEMPLATES
};
