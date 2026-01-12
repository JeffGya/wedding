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

/**
 * Load logo HTML with specific color for hero section
 * @param {string} color - Color hex code (e.g., '#E3B13F')
 * @returns {string} HTML string for the logo with color applied
 */
function loadLogoHtmlWithColor(color) {
  try {
    // Try to load SVG and apply color
    const rawSvg = fs.readFileSync(
      path.join(__dirname, 'wedding-logo.svg'), 
      'utf8'
    );
    
    // Apply color to all path elements
    // First, replace any existing fill attributes
    let coloredSvg = rawSvg.replace(/fill="[^"]*"/g, `fill="${color}"`);
    coloredSvg = coloredSvg.replace(/fill='[^']*'/g, `fill='${color}'`);
    
    // Replace fill in style attributes
    coloredSvg = coloredSvg.replace(/style="([^"]*)"/g, (match, styleContent) => {
      const newStyle = styleContent.replace(/fill:[^;]*/g, `fill:${color}`);
      return `style="${newStyle}"`;
    });
    
    // Add fill attribute to all path elements that don't have one
    // This handles paths with only class attributes (like class="cls-1")
    coloredSvg = coloredSvg.replace(/<path([^>]*)>/g, (match, attributes) => {
      // Check if fill attribute already exists
      if (attributes.includes('fill=')) {
        return match; // Already has fill, return as is (already replaced above)
      }
      // Add fill attribute
      return `<path fill="${color}"${attributes}>`;
    });
    
    // Size the SVG appropriately for hero section
    coloredSvg = coloredSvg.replace(
      '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 928.06 899.01">',
      `<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 928.06 899.01" width="60" height="60" style="max-width: 60px; max-height: 60px; display: block; margin: 0 auto;">`
    );
    
    return coloredSvg;
  } catch (svgError) {
    // Fallback to text logo with color
    return `<div style="font-family: 'Great Vibes', cursive; font-size: 24px; color: ${color}; margin: 0 auto; text-align: center;">Brigita & Jeffrey</div>`;
  }
}

const EMAIL_TEMPLATES = {
  elegant: {
    name: 'Elegant',
    description: 'Modular design with clear sections: Hero, Context, Info Card, CTA, Secondary Info, Sign-off, Footer',
    // Background colors
    background: '#D2C6B2 ',
    wrapper: {
      background: '#A68626',
      padding: '16px',
      paddingMobile: '8px', // Mobile wrapper padding
      borderRadius: '60px', // Desktop border radius
      borderRadiusMobile: '36px', // Mobile border radius
      marginTop: '0px',
      marginTopMobile: '0px', // Mobile marginTop for overlay image
    },
    container: {
      background: '#E9E7D9',
      width: '560px', // Desktop: 560px
      widthMobile: '100%', // Mobile: 100%
      padding:  '20px', // Desktop padding
      paddingTop: '20px', // Desktop padding
      paddingTopMobile: '16px', // Mobile paddingTop
      paddingMobile: '16px', // Mobile padding
      borderRadius: '44px', // Desktop border radius
      borderRadiusMobile: '32px', // Mobile border radius
      spacing: '32px', // Spacing between sections
    },
    // Section 0: Preheader (hidden)
    preheader: {
      fontSize: '12px',
      color: '#F7F6F4' // Same as background to hide
    },
    // Section 1: Hero
    hero: {
      padding: '24px 0',
      spacing: '16px', // 12-16px spacing
      titleFont: "'Great Vibes', 'Brush Script MT', 'Lucida Handwriting', cursive, Georgia, 'Times New Roman', serif",
      titleSize: '64px', // Desktop: 32-36px (using 34px)
      titleSizeMobile: '30px', // Mobile: 28-32px (using 30px)
      subtitleFont: "'Lora', Georgia, 'Times New Roman', serif",
      subtitleSize: '20px', // 16-18px (using 17px)
      titleColor: '#E3B13F',
      borderRadius: '24px', // Desktop border radius
      borderRadiusMobile: '16px' // Mobile border radius
    },
    // Section 2: Context/Message
    context: {
      spacing: '12px',
      headingSize: '22px', // 20-24px (using 22px)
      bodySize: '17px', // 16-18px (using 17px)
      bodyFont: "'Open Sans', Arial, sans-serif",
      textColor: '#442727',
      padding: '0px'
    },
    // Section 3: Info Card (optional)
    infoCard: {
      background: '#D2C6B2', // Soft neutral
      padding: '18px', // 16-20px (using 18px)
      borderRadius: '24px', // Desktop border radius
      borderRadiusMobile: '16px', // Mobile border radius
      border: '1px solid #ABA38D', // Optional light gray border
      spacing: '8px', // 8-12px (using 10px)
      labelSize: '12px', // Small caps or lighter
      valueSize: '16px',
      textColor: '#442727'
    },
    // Section 4: RSVP Code (optional - standalone segment)
    rsvpCode: {
      background: '#D2C6B2', // Soft neutral (same family as info card)
      padding: '18px', // 16-20px (using 18px)
      borderRadius: '24px', // Desktop border radius
      borderRadiusMobile: '16px', // Mobile border radius
      border: '1px dashed #ABA38D', // Dashed or subtle solid
      spacing: '10px', // 8-12px (using 10px)
      labelSize: '12px',
      codeSize: '24px',
      codeFont: "'Courier New', monospace",
      textColor: '#442727'
    },
    // Section 5: Primary CTA
    cta: {
      height: '48px', // Minimum height
      padding: '24px', // Horizontal padding
      borderRadius: '16px', // Desktop border radius
      borderRadiusMobile: '16px', // Mobile border radius
      maxWidth: '320px', // Desktop max width
      widthMobile: '100%', // Mobile: fill container
      background: '#442727',
      textColor: '#D2C6B2',
      font: "'Open Sans', Arial, sans-serif",
      fontSize: '16px',
      fontWeight: '600'
    },
    // Section 6: Secondary Information
    secondaryInfo: {
      spacing: '10px', // 8-12px (using 10px)
      fontSize: '15px', // 14-16px (using 15px)
      textColor: '#442727'
    },
    // Section 7: Personal Sign-off
    signoff: {
      fontSize: '20px', // 16-18px (using 17px)
      font: "'Great Vibes', 'Brush Script MT', 'Lucida Handwriting', cursive, Georgia, 'Times New Roman', serif",
      signatureFont: "'Great Vibes', 'Brush Script MT', 'Lucida Handwriting', cursive, Georgia, 'Times New Roman', serif",
      signatureSize: '80px', // Desktop signature size
      signatureSizeMobile: '40px', // Mobile signature size
      textColor: '#442727'
    },
    // Section 8: Footer
    footer: {
      paddingTop: '24px',
      spacing: '8px',
      fontSize: '12px', // 12-13px
      textColor: '#666666', // Lower contrast
      linkColor: '#DAA520'
    },
    // Legacy properties for backward compatibility
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
      background: '#DAA520',
      textColor: '#442727',
      border: '2px solid #442727',
      font: "'Open Sans', Arial, Helvetica, sans-serif",
      fontSize: '16px',
      fontWeight: '700',
      borderRadius: '6px', // Desktop border radius
      borderRadiusMobile: '4px', // Mobile border radius
      padding: '14px 28px'
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
 * Extract top overlay image URL from content marker and return cleaned content
 * Marker format: <!--TOP_OVERLAY_IMAGE:https://...-->
 */
function extractTopOverlayImage(content) {
  if (!content) {
    return {
      topOverlayImageUrl: null,
      cleanedContent: ''
    };
  }
  
  const regex = /<!--TOP_OVERLAY_IMAGE:(.*?)-->/;
  const match = content.match(regex);
  
  if (match) {
    return {
      topOverlayImageUrl: match[1].trim(),
      cleanedContent: content.replace(regex, '').trim()
    };
  }
  
  return {
    topOverlayImageUrl: null,
    cleanedContent: content
  };
}

/**
 * Extract header image URL from content marker and return cleaned content
 * Marker format: <!--HEADER_IMAGE:https://...-->
 */
/**
 * Extract hero image from content marker and return cleaned content
 * Supports both old HEADER_IMAGE and new HERO_IMAGE markers for backward compatibility
 * Marker format: <!--HERO_IMAGE:https://...--> or <!--HEADER_IMAGE:https://...-->
 */
function extractHeroImage(content) {
  if (!content) {
    return {
      heroImageUrl: null,
      cleanedContent: ''
    };
  }
  
  // Try new HERO_IMAGE marker first
  const heroImageRegex = /<!--HERO_IMAGE:(.*?)-->/;
  let match = content.match(heroImageRegex);
  let cleanedContent = content;
  
  if (match) {
    return {
      heroImageUrl: match[1].trim(),
      cleanedContent: content.replace(heroImageRegex, '').trim()
    };
  }
  
  // Fallback to old HEADER_IMAGE marker for backward compatibility
  const headerImageRegex = /<!--HEADER_IMAGE:(.*?)-->/;
  match = content.match(headerImageRegex);
  
  if (match) {
    return {
      heroImageUrl: match[1].trim(),
      cleanedContent: content.replace(headerImageRegex, '').trim()
    };
  }
  
  return {
    heroImageUrl: null,
    cleanedContent: content
  };
}

/**
 * Extract preheader text from content marker
 * Marker format: <!--PREHEADER:Custom preheader text-->
 */
function extractPreheader(content) {
  if (!content) {
    return {
      preheaderText: null,
      cleanedContent: ''
    };
  }
  
  const regex = /<!--PREHEADER:(.*?)-->/;
  const match = content.match(regex);
  
  if (match) {
    return {
      preheaderText: match[1].trim(),
      cleanedContent: content.replace(regex, '').trim()
    };
  }
  
  return {
    preheaderText: null,
    cleanedContent: content
  };
}

/**
 * Extract hero subtitle from content marker
 * Marker format: <!--HERO_SUBTITLE:Custom subtitle text-->
 */
function extractHeroSubtitle(content) {
  if (!content) {
    return {
      subtitle: null,
      cleanedContent: ''
    };
  }
  
  const regex = /<!--HERO_SUBTITLE:(.*?)-->/;
  const match = content.match(regex);
  
  if (match) {
    return {
      subtitle: match[1].trim(),
      cleanedContent: content.replace(regex, '').trim()
    };
  }
  
  return {
    subtitle: null,
    cleanedContent: content
  };
}

/**
 * Extract info card configuration (toggle and custom labels)
 * Marker formats:
 * - <!--INFO_CARD:enabled--> or <!--INFO_CARD:disabled-->
 * - <!--INFO_CARD_DATE_LABEL:Wedding Date-->
 * - <!--INFO_CARD_LOCATION_LABEL:Venue-->
 * - <!--INFO_CARD_TIME_LABEL:Start Time-->
 */
function extractInfoCardConfig(content) {
  if (!content) {
    return {
      showInfoCard: null,
      dateLabel: null,
      locationLabel: null,
      timeLabel: null,
      cleanedContent: ''
    };
  }
  
  const toggleRegex = /<!--INFO_CARD:(enabled|disabled)-->/;
  const dateLabelRegex = /<!--INFO_CARD_DATE_LABEL:(.*?)-->/;
  const locationLabelRegex = /<!--INFO_CARD_LOCATION_LABEL:(.*?)-->/;
  const timeLabelRegex = /<!--INFO_CARD_TIME_LABEL:(.*?)-->/;
  
  const toggleMatch = content.match(toggleRegex);
  const dateLabelMatch = content.match(dateLabelRegex);
  const locationLabelMatch = content.match(locationLabelRegex);
  const timeLabelMatch = content.match(timeLabelRegex);
  
  let cleaned = content;
  if (toggleMatch) cleaned = cleaned.replace(toggleRegex, '').trim();
  if (dateLabelMatch) cleaned = cleaned.replace(dateLabelRegex, '').trim();
  if (locationLabelMatch) cleaned = cleaned.replace(locationLabelRegex, '').trim();
  if (timeLabelMatch) cleaned = cleaned.replace(timeLabelRegex, '').trim();
  
  return {
    showInfoCard: toggleMatch ? toggleMatch[1] === 'enabled' : null,
    dateLabel: dateLabelMatch ? dateLabelMatch[1].trim() : null,
    locationLabel: locationLabelMatch ? locationLabelMatch[1].trim() : null,
    timeLabel: timeLabelMatch ? timeLabelMatch[1].trim() : null,
    cleanedContent: cleaned
  };
}

/**
 * Extract RSVP code toggle from content marker
 * Marker format: <!--RSVP_CODE:enabled--> or <!--RSVP_CODE:disabled-->
 */
function extractRsvpCodeToggle(content) {
  if (!content) {
    return {
      showRsvpCode: null,
      cleanedContent: ''
    };
  }
  
  const regex = /<!--RSVP_CODE:(enabled|disabled)-->/;
  const match = content.match(regex);
  
  if (match) {
    return {
      showRsvpCode: match[1] === 'enabled',
      cleanedContent: content.replace(regex, '').trim()
    };
  }
  
  return {
    showRsvpCode: null,
    cleanedContent: content
  };
}

/**
 * Extract secondary information from content marker
 * Marker format: <!--SECONDARY_INFO:Custom secondary information text-->
 */
function extractSecondaryInfo(content) {
  if (!content) {
    return {
      secondaryInfo: null,
      cleanedContent: ''
    };
  }
  
  const regex = /<!--SECONDARY_INFO:(.*?)-->/;
  const match = content.match(regex);
  
  if (match) {
    return {
      secondaryInfo: match[1].trim(),
      cleanedContent: content.replace(regex, '').trim()
    };
  }
  
  return {
    secondaryInfo: null,
    cleanedContent: content
  };
}

/**
 * Extract custom email title from content marker and return cleaned content
 * Marker format: <!--EMAIL_TITLE:Custom Title Here-->
 */
function extractEmailTitle(content) {
  if (!content) {
    return {
      customTitle: null,
      cleanedContent: ''
    };
  }
  
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
  const availableWidth = 520; // Container width (520px)
  const minSize = 28; // Minimum size for very long titles (mobile)
  const maxSize = 36; // Maximum size for very short titles (desktop)
  
  // Estimate character width for cursive font Great Vibes
  const targetWidth = availableWidth * 0.9; // 90% of width
  const estimatedCharWidth = 0.70;
  const calculatedSize = Math.floor((targetWidth / titleLength) / estimatedCharWidth);
  
  return Math.max(minSize, Math.min(maxSize, calculatedSize));
}

/**
 * Replace custom fonts with system fonts for fallback mode
 * @param {string} fontFamily - Font family string
 * @returns {string} System font fallback
 */
function getSystemFontFallback(fontFamily) {
  if (!fontFamily) return 'Arial, sans-serif';
  
  // Check for cursive/script fonts (Great Vibes, etc.)
  if (fontFamily.includes('Great Vibes') || fontFamily.includes('Brush Script') || fontFamily.includes('Lucida Handwriting') || fontFamily.includes('cursive')) {
    return 'Georgia, "Times New Roman", serif';
  }
  
  // Check for serif fonts (Lora, etc.)
  if (fontFamily.includes('Lora') || fontFamily.includes('Georgia') || fontFamily.includes('Times')) {
    return 'Georgia, "Times New Roman", serif';
  }
  
  // Default to sans-serif
  return 'Arial, Helvetica, sans-serif';
}

/**
 * Extract button from content using marker format
 * @param {string} content - The content to extract button from
 * @returns {Object} Object with button object (or null) and cleaned content
 */
function extractButton(content) {
  if (!content) {
    return {
      button: null,
      cleanedContent: ''
    };
  }
  
  let cleanedContent = content;
  
  // Extract button marker: <!--BUTTON:text|type|value-->
  const buttonMarkerRegex = /<!--BUTTON:([^|]+)\|([^|]+)\|([^>]*)-->/g;
  const matches = [];
  let match;
  
  while ((match = buttonMarkerRegex.exec(content)) !== null) {
    matches.push({
      fullMatch: match[0],
      text: match[1].trim(),
      type: match[2].trim(),
      value: match[3].trim()
    });
  }
  
  // Check for multiple markers - this is an error
  if (matches.length > 1) {
    logger.error('[BUTTON_EXTRACT] Multiple button markers detected', {
      count: matches.length,
      markers: matches.map(m => ({ text: m.text, type: m.type, value: m.value }))
    });
    throw new Error(`Multiple button markers found in content. Only one button is allowed per template. Found ${matches.length} markers.`);
  }
  
  if (matches.length === 0) {
    return {
      button: null,
      cleanedContent: content.trim()
    };
  }
  
  // Extract the single button
  const buttonMatch = matches[0];
  const button = {
    text: buttonMatch.text,
    type: buttonMatch.type,
    value: buttonMatch.value
  };
  
  // Remove marker from content
  cleanedContent = cleanedContent.replace(buttonMatch.fullMatch, '').trim();
  
  return {
    button,
    cleanedContent
  };
}

/**
 * Generate the new modular email template based on Figma design
 * Implements 8-section modular structure
 * @param {string} content - Email content
 * @param {Object} options - Template options
 * @param {string} style - Template style ('elegant', 'modern', 'friendly')
 * @param {boolean} fallbackMode - If true, strip web fonts and inline all styles for maximum email client compatibility
 */
function generateDefinitiveEmailHTML(content, options = {}, style = 'elegant', fallbackMode = false) {
  const { getTranslation, getSectionTranslations } = require('./emailLocale');
  const language = options.language || 'en';
  const lang = language === 'lt' ? 'lt' : 'en';
  const rsvpCodeTranslations = getSectionTranslations('rsvpCode', lang);
  const getTrans = (key) => getTranslation(key, lang);

  // Get the selected template config, fallback to elegant
  const selectedConfig = EMAIL_TEMPLATES[style] || EMAIL_TEMPLATES.elegant;
  const elegantConfig = EMAIL_TEMPLATES.elegant;
  
  // Merge with elegant defaults for missing properties
  const config = {
    background: selectedConfig.background || elegantConfig.background,
    wrapper: selectedConfig.wrapper || elegantConfig.wrapper,
    container: selectedConfig.container || elegantConfig.container,
    preheader: selectedConfig.preheader || elegantConfig.preheader,
    hero: selectedConfig.hero || elegantConfig.hero,
    context: selectedConfig.context || elegantConfig.context,
    infoCard: selectedConfig.infoCard || elegantConfig.infoCard,
    rsvpCode: selectedConfig.rsvpCode || elegantConfig.rsvpCode,
    cta: selectedConfig.cta || elegantConfig.cta,
    secondaryInfo: selectedConfig.secondaryInfo || elegantConfig.secondaryInfo,
    signoff: selectedConfig.signoff || elegantConfig.signoff,
    footer: selectedConfig.footer || elegantConfig.footer,
    // Keep legacy properties for backward compatibility
    header: selectedConfig.header,
    content: selectedConfig.content,
    button: selectedConfig.button
  };
  const {
    title = 'Brigita & Jeffrey',
    subtitle = null, // Optional subline
    footerText = 'With love and joy,',
    siteUrl = 'https://your-wedding-site.com',
    preheaderText = "We can't wait to celebrate with you",
    // Optional info card data (auto-populated from template variables if available)
    infoCard = null, // { date: { label: 'Date', value: '...' }, location: {...}, time: {...} }
    rsvpCode = null, // Optional RSVP code to display
    secondaryInfo = null, // Optional secondary information blocks
    contactInfo = null // Optional contact information for footer
  } = options;


  // Ensure content is a string
  const safeContent = content || '';
  
  // Extract all markers in sequence (preserve order as specified in plan)
  // 1. Top Overlay Image (first, so it overlays everything)
  const { topOverlayImageUrl, cleanedContent: contentAfterTopOverlay } = extractTopOverlayImage(safeContent);
  
  // 2. Preheader
  const { preheaderText: extractedPreheader, cleanedContent: contentAfterPreheader } = extractPreheader(contentAfterTopOverlay);
  
  // 3. Hero Image (replaces Header Image)
  const { heroImageUrl, cleanedContent: contentAfterImage } = extractHeroImage(contentAfterPreheader);
  
  // 4. Hero Subtitle
  const { subtitle: extractedSubtitle, cleanedContent: contentAfterSubtitle } = extractHeroSubtitle(contentAfterImage);
  
  // 5. Email Title (existing)
  const { customTitle, cleanedContent: contentAfterTitle } = extractEmailTitle(contentAfterSubtitle);
  
  // 6. Info Card Config (toggle + labels)
  const { 
    showInfoCard, 
    dateLabel: customDateLabel, 
    locationLabel: customLocationLabel, 
    timeLabel: customTimeLabel, 
    cleanedContent: contentAfterInfoCard 
  } = extractInfoCardConfig(contentAfterTitle);
  
  // 7. RSVP Code Toggle
  const { showRsvpCode: extractedShowRsvpCode, cleanedContent: contentAfterRsvpToggle } = extractRsvpCodeToggle(contentAfterInfoCard);
  
  // 8. Secondary Info
  const { secondaryInfo: extractedSecondaryInfo, cleanedContent: contentAfterSecondaryInfo } = extractSecondaryInfo(contentAfterRsvpToggle);
  
  // 9. Button (single button marker)
  const { button, cleanedContent: mainContent } = extractButton(contentAfterSecondaryInfo);
  
  // Generate button URL if button exists
  let buttonUrl = null;
  if (button) {
    if (button.type === 'home') {
      buttonUrl = `${siteUrl}/${language}/home`;
    } else if (button.type === 'rsvp') {
      if (rsvpCode) {
        buttonUrl = `${siteUrl}/${language}/rsvp/${rsvpCode}`;
      } else {
        buttonUrl = `${siteUrl}/${language}/rsvp`;
      }
    } else if (button.type === 'page') {
      if (!button.value) {
        logger.warn('[BUTTON] Page type button missing slug value', { button });
        buttonUrl = `${siteUrl}/${language}/home`; // Fallback to home
      } else {
        buttonUrl = `${siteUrl}/${language}/pages/${button.value}`;
      }
    } else {
      logger.error('[BUTTON] Unknown button type', { button });
      buttonUrl = `${siteUrl}/${language}/home`; // Fallback to home
    }
  }
  
  // Use extracted values, falling back to options
  const finalPreheaderText = extractedPreheader || preheaderText;
  const finalSubtitle = extractedSubtitle || subtitle;
  const finalSecondaryInfo = extractedSecondaryInfo || secondaryInfo;
  
  // Use custom title from marker, or fall back to options title
  const displayTitle = customTitle || title;
  
  // Apply custom info card labels if provided
  if (infoCard) {
    if (infoCard.date && customDateLabel) {
      infoCard.date.label = customDateLabel;
    }
    if (infoCard.location && customLocationLabel) {
      infoCard.location.label = customLocationLabel;
    }
    if (infoCard.time && customTimeLabel) {
      infoCard.time.label = customTimeLabel;
    }
  }
  
  // Respect toggle settings: only show sections when explicitly enabled via markers
  // If marker is null (not set), don't show the section even if data exists
  const shouldShowInfoCard = showInfoCard === true;
  const shouldShowRsvpCode = extractedShowRsvpCode === true;
  
  // Get font families based on fallback mode (must be before sections are created)
  const heroTitleFont = fallbackMode ? getSystemFontFallback(config.hero.titleFont) : config.hero.titleFont;
  const heroSubtitleFont = fallbackMode ? getSystemFontFallback(config.hero.subtitleFont) : config.hero.subtitleFont;
  const contextBodyFont = fallbackMode ? getSystemFontFallback(config.context.bodyFont) : config.context.bodyFont;
  const ctaFont = fallbackMode ? getSystemFontFallback(config.cta.font) : config.cta.font;
  const signoffFont = fallbackMode ? getSystemFontFallback(config.signoff.font) : config.signoff.font;
  const signatureFont = fallbackMode ? getSystemFontFallback(config.signoff.signatureFont) : config.signoff.signatureFont;
  const bodyFont = fallbackMode ? 'Arial, Helvetica, sans-serif' : "'Open Sans', Arial, sans-serif";
  const headingFont = fallbackMode ? 'Georgia, "Times New Roman", serif' : "'Lora', Georgia, 'Times New Roman', serif";
  
  // Section 0: Preheader (hidden)
  const preheaderSection = `
    <!-- Preheader / Hidden -->
    <div style="display: none; font-size: 0; line-height: 0; max-height: 0; max-width: 0; overflow: hidden; mso-hide: all;">
      ${finalPreheaderText}
                </div>
  `;


  // Section 1: Hero
  // If hero image present: Display as square background image with title/subtitle/logo aligned to bottom
  // Desktop: square based on container width minus padding, Mobile: 100% width with square aspect ratio
  // If no hero image: Display title/subtitle only (current behavior)
  
  // Calculate square dimensions: container width minus left/right padding
  const containerWidth = parseInt(config.container.width) || 560;
  const containerPadding = parseInt(config.container.padding) || 24;
  const heroSquareSize = containerWidth - (containerPadding * 2); // 560 - 48 = 512px
  
  const heroSection = heroImageUrl ? `
    <!-- Hero Section with Background Image (Square) -->
    <tr>
      <td style="padding: 0; text-align: center;">
        <!-- Outer wrapper for responsive width (100% on mobile, max square size on desktop) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="hero-image-wrapper" style="max-width: ${heroSquareSize}px; margin: 0 auto; border-radius: ${config.hero.borderRadius}; overflow: hidden;">
          <tr>
            <!-- Square container: using background attribute and explicit height/width for reliable square in email clients -->
            <!-- Square size calculated: container width (${containerWidth}px) minus padding (${containerPadding * 2}px) = ${heroSquareSize}px -->
            <td width="${heroSquareSize}" height="${heroSquareSize}" background="${heroImageUrl}" class="hero-image" style="width: 100%; max-width: ${heroSquareSize}px; padding: 0; background-image: url('${heroImageUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat; border-radius: ${config.hero.borderRadius};">
              <!-- Content table with explicit height matching td, uses spacer rows to position content at bottom -->
              <table role="presentation" width="${heroSquareSize}" height="${heroSquareSize}" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: ${heroSquareSize}px;">
                <!-- Spacer rows to push content to bottom - total = ${heroSquareSize - 200}px for ${heroSquareSize}px square -->
                <tr>
                  <td style="height: ${Math.floor((heroSquareSize - 200) / 2)}px; line-height: 1px; font-size: 1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="height: ${Math.floor((heroSquareSize - 200) / 2)}px; line-height: 1px; font-size: 1px;">&nbsp;</td>
                </tr>
                <!-- Content row at bottom with gradient overlay background - overlays on background-image -->
                <tr>
                  <td style="padding-bottom: 24px; padding-left: 24px; padding-right: 24px; text-align: center; background: linear-gradient(to top, rgba(15,15,15,0.4), transparent);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="text-align: center;">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <h1 class="hero-title" style="margin: 0; padding: 0; font-family: ${heroTitleFont}; font-size: ${config.hero.titleSize}; color: ${config.hero.titleColor}; font-weight: normal; line-height: 1.2; text-shadow: 0 2px 4px rgba(15,15,15,0.5);">
                            ${displayTitle}
                          </h1>
                        </td>
                      </tr>
                      ${finalSubtitle ? `
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p class="hero-subtitle" style="margin: 0; padding: 0; font-size: ${config.hero.subtitleSize}; font-family: ${heroSubtitleFont}; color: ${config.hero.titleColor}; line-height: 1.4; text-shadow: 0 1px 2px rgba(15,15,15,0.5);">
                            ${finalSubtitle}
                          </p>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding-bottom: 24px;">
                          ${loadLogoHtmlWithColor(config.hero.titleColor)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : `
    <!-- Hero Section without Background Image -->
    <tr>
      <td style="padding: ${config.hero.padding}; text-align: center;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom: ${config.hero.spacing};">
              <h1 class="hero-title" style="margin: 0; padding: 0; font-family: ${heroTitleFont}; font-size: ${config.hero.titleSize}; color: ${config.hero.titleColor}; font-weight: normal; line-height: 1.2;">
                ${displayTitle}
              </h1>
            </td>
          </tr>
          ${finalSubtitle ? `
          <tr>
            <td>
              <p class="hero-subtitle" style="margin: 0; padding: 0; font-size: ${config.hero.subtitleSize}; font-family: ${heroSubtitleFont}; color: ${config.hero.titleColor}; line-height: 1.4;">
                ${finalSubtitle}
              </p>
            </td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
  `;

  // Section 2: Context/Message Block
  const contextSection = `
    <!-- Context / Message Section -->
    <tr>
      <td style="padding-bottom: ${config.container.spacing};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="context-body" style="font-family: ${contextBodyFont}; font-size: ${config.context.bodySize}; line-height: 1.6; color: ${config.context.textColor}; padding-left: ${config.context.padding}; padding-right: ${config.context.padding};">
              ${mainContent}
            </td>
          </tr>
                        </table>
                      </td>
                    </tr>
  `;

  // Section 3: Info Card (optional) - respect toggle setting
  const infoCardSection = (shouldShowInfoCard && infoCard) ? `
    <!-- Info Card Section -->
    <tr>
      <td style="padding-bottom: ${config.container.spacing};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="info-card" style="background-color: ${config.infoCard.background}; border: ${config.infoCard.border}; border-radius: ${config.infoCard.borderRadius};">
          <tr>
            <td style="padding: ${config.infoCard.padding};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${infoCard.date ? `
                <tr>
                  <td style="padding-bottom: ${infoCard.location || infoCard.time ? config.infoCard.spacing : '0'};">
                    <div style="font-size: ${config.infoCard.labelSize}; text-transform: uppercase; color: ${config.infoCard.textColor}; opacity: 0.7; margin-bottom: 4px;">${infoCard.date.label || getTrans('infoCard.date')}</div>
                    <div style="font-size: ${config.infoCard.valueSize}; color: ${config.infoCard.textColor}; font-weight: 500;">${infoCard.date.value}</div>
                  </td>
                </tr>
                ` : ''}
                ${infoCard.location ? `
                <tr>
                  <td style="padding-bottom: ${infoCard.time ? config.infoCard.spacing : '0'};">
                    <div style="font-size: ${config.infoCard.labelSize}; text-transform: uppercase; color: ${config.infoCard.textColor}; opacity: 0.7; margin-bottom: 4px;">${infoCard.location.label || getTrans('infoCard.location')}</div>
                    <div style="font-size: ${config.infoCard.valueSize}; color: ${config.infoCard.textColor}; font-weight: 500;">${infoCard.location.value}</div>
                  </td>
                </tr>
                ` : ''}
                ${infoCard.time ? `
                <tr>
                  <td>
                    <div style="font-size: ${config.infoCard.labelSize}; text-transform: uppercase; color: ${config.infoCard.textColor}; opacity: 0.7; margin-bottom: 4px;">${infoCard.time.label || getTrans('infoCard.time')}</div>
                    <div style="font-size: ${config.infoCard.valueSize}; color: ${config.infoCard.textColor}; font-weight: 500;">${infoCard.time.value}</div>
                  </td>
                </tr>
                ` : ''}
                  </table>
            </td>
          </tr>
        </table>
            </td>
          </tr>
  ` : '';

  // Section 4: RSVP Code component (if provided) - standalone segment - respect toggle setting
  const rsvpCodeSection = (shouldShowRsvpCode && rsvpCode) ? `
    <!-- RSVP Code Section (Standalone) -->
    <tr>
      <td style="padding-bottom: ${config.container.spacing};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="rsvp-code" style="background-color: ${config.rsvpCode.background}; border: ${config.rsvpCode.border}; border-radius: ${config.rsvpCode.borderRadius};">
          <tr>
            <td style="padding: ${config.rsvpCode.padding}; text-align: center;">
              <div style="font-size: ${config.rsvpCode.labelSize}; text-transform: uppercase; color: ${config.rsvpCode.textColor}; opacity: 0.7; margin-bottom: ${config.rsvpCode.spacing};">${rsvpCodeTranslations.label || 'RSVP Code'}</div>
              <div style="font-size: ${config.rsvpCode.codeSize}; font-weight: 700; color: ${config.rsvpCode.textColor}; letter-spacing: 2px; font-family: ${config.rsvpCode.codeFont};">${rsvpCode}</div>
            </td>
          </tr>
        </table>
            </td>
          </tr>
  ` : '';

  // Section 5: Primary CTA (single button extracted from content)
  const ctaSection = (button && buttonUrl) ? `
    <!-- Primary CTA Section -->
    <tr>
      <td style="padding-bottom: ${config.container.spacing}; text-align: center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button-wrapper" style="margin: 0 auto; width: auto;">
          <tr>
            <td class="cta-button" style="background-color: ${config.cta.background}; border-radius: ${config.cta.borderRadius}; height: ${config.cta.height}; max-height: ${config.cta.height}; padding: 0 ${config.cta.padding}; text-align: center; mso-padding-alt: 0;">
                          <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonUrl}" style="height:${config.cta.height};v-text-anchor:middle;width:200px;" arcsize="25%" strokecolor="${config.cta.background}" fillcolor="${config.cta.background}">
                            <w:anchorlock/>
                <center style="color:${config.cta.textColor};font-family:Arial,sans-serif;font-size:${config.cta.fontSize};font-weight:${config.cta.fontWeight};">
                  ${button.text}
                </center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
              <a href="${buttonUrl}" style="font-family: ${ctaFont}; font-size: ${config.cta.fontSize}; font-weight: ${config.cta.fontWeight}; color: ${config.cta.textColor}; text-decoration: none; display: block; width: 100%; height: ${config.cta.height}; line-height: ${config.cta.height}; overflow: hidden; box-sizing: border-box;">
                ${button.text}
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
  ` : '';

  // Section 6: Secondary Information
  const secondaryInfoSection = finalSecondaryInfo ? `
    <!-- Secondary Information Section -->
    <tr>
      <td style="padding-bottom: ${config.container.spacing};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${Array.isArray(finalSecondaryInfo) ? finalSecondaryInfo.map(info => `
          <tr>
            <td style="padding-bottom: ${config.secondaryInfo.spacing}; font-size: ${config.secondaryInfo.fontSize}; color: ${config.secondaryInfo.textColor}; line-height: 1.5;">
              ${info}
            </td>
          </tr>
          `).join('') : `
          <tr>
            <td style="font-size: ${config.secondaryInfo.fontSize}; color: ${config.secondaryInfo.textColor}; line-height: 1.5;">
              ${finalSecondaryInfo}
            </td>
          </tr>
          `}
                    </table>
                  </td>
                </tr>
  ` : '';

  // Section 7: Personal Sign-off
  const signoffSection = `
    <!-- Personal Sign-off Section -->
    <tr>
      <td style="padding-bottom: ${config.container.spacing};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family: ${signoffFont}; font-size: ${config.signoff.fontSize}; color: ${config.signoff.textColor}; line-height: 1.6; text-align: center;">
              <p style="margin: 0 0 12px 0;">
                ${footerText}
              </p>
              <p class="signature-text" style="margin: 0; font-family: ${signatureFont}; font-size: ${config.signoff.signatureSize}; color: ${config.signoff.textColor};">
                Brigita &amp; Jeffrey
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  // Section 8: Footer
  const footerSection = `
    <!-- Footer Section -->
    <tr>
      <td style="padding-top: ${config.footer.paddingTop}; border-top: 1px solid #E5E5E5;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="text-align: center; padding-bottom: ${config.footer.spacing};">
              <a href="${siteUrl}" style="font-size: ${config.footer.fontSize}; color: ${config.footer.linkColor}; text-decoration: none;">
                ${siteUrl.replace(/^https?:\/\//, '')}
              </a>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding-bottom: ${config.footer.spacing}; font-size: ${config.footer.fontSize}; color: ${config.footer.textColor}; line-height: 1.5;">
              ${getTrans('footer.disclaimer')}
            </td>
          </tr>
          ${contactInfo ? `
          <tr>
            <td style="text-align: center; padding-bottom: ${config.footer.spacing}; font-size: ${config.footer.fontSize}; color: ${config.footer.textColor};">
              ${contactInfo}
            </td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
  `;

  // Build complete HTML structure
  const html = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Wedding Invitation</title>
  ${!fallbackMode ? `<!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Lora:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">` : ''}
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
    ${!fallbackMode ? `@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Lora:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&display=swap');` : ''}
    
    /* Reset styles for email clients */
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    
    /* Prevent dark mode color inversion */
    [data-ogsc] .email-bg { background-color: ${config.background} !important; }
    [data-ogsc] .card-bg { background-color: ${config.container.background} !important; }
    
    /* Apply font to h2 and below headings with fallback */
    h2, h3, h4, h5, h6 {
      font-family: ${headingFont} !important;
    }
    
    /* Ensure container padding is applied */
    .email-content {
      padding-top: ${config.container.padding} !important;
      padding-right: ${config.container.padding} !important;
      padding-bottom: ${config.container.padding} !important;
      padding-left: ${config.container.padding} !important;
    }
    
    /* Top overlay image styles */
    .top-overlay-image {
      width: 560px;
      max-width: 560px;
      height: auto;
    }
    
    /* Mobile breakpoint (480px and below) */
    @media screen and (max-width: 480px) {
      .email-container { 
        width: 100% !important; 
        max-width: 100% !important; 
      }
      .email-content { 
        padding-top: ${config.container.paddingTopMobile || config.container.paddingTop} !important; 
        padding-right: ${config.container.paddingMobile} !important; 
        padding-bottom: ${config.container.paddingMobile} !important; 
        padding-left: ${config.container.paddingMobile} !important; 
      }
      .hero-title { 
        font-size: ${config.hero.titleSizeMobile} !important; 
      }
      .cta-button-wrapper {
        width: 100% !important;
        max-width: 100% !important;
      }
      .cta-button { 
        width: 100% !important; 
        max-width: 100% !important;
      }
      .context-body { 
        font-size: 15px !important; 
      }
      .top-overlay-image {
        width: 100% !important;
        max-width: 100% !important;
      }
      .signature-text {
        font-size: ${config.signoff.signatureSizeMobile || config.signoff.signatureSize} !important;
      }
      /* Mobile border radius overrides */
      .email-wrapper {
        border-radius: ${config.wrapper?.borderRadiusMobile || config.wrapper?.borderRadius || '24px'} !important;
      }
      .email-container {
        border-radius: ${config.container.borderRadiusMobile || config.container.borderRadius} !important;
      }
      .hero-image-wrapper {
        border-radius: ${config.hero.borderRadiusMobile || config.hero.borderRadius} !important;
      }
      .hero-image {
        border-radius: ${config.hero.borderRadiusMobile || config.hero.borderRadius} !important;
      }
      .info-card {
        border-radius: ${config.infoCard.borderRadiusMobile || config.infoCard.borderRadius} !important;
      }
      .rsvp-code {
        border-radius: ${config.rsvpCode.borderRadiusMobile || config.rsvpCode.borderRadius} !important;
      }
      .cta-button {
        border-radius: ${config.cta.borderRadiusMobile || config.cta.borderRadius} !important;
      }
    }
    
    /* Tablet breakpoint (600px and below) */
    @media screen and (max-width: 600px) {
      .email-container { 
        max-width: 100% !important; 
      }
      .email-content { 
        padding-top: ${config.container.paddingTopMobile || config.container.paddingTop} !important; 
        padding-right: ${config.container.paddingMobile} !important; 
        padding-bottom: ${config.container.paddingMobile} !important; 
        padding-left: ${config.container.paddingMobile} !important; 
      }
      .cta-button-wrapper {
        width: 100% !important;
        max-width: 100% !important;
      }
      .top-overlay-image {
        width: 100% !important;
        max-width: 100% !important;
      }
    }
    
    /* Mobile wrapper padding override */
    @media screen and (max-width: 480px) {
      .email-wrapper-padding {
        padding: ${config.wrapper?.paddingMobile || config.wrapper?.padding || '24px'} !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${config.background}; font-family: ${bodyFont};" class="email-bg">
  ${preheaderSection}
  
  <!-- Main Container Table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${config.background};" class="email-bg">
    <tr>
      <td align="center" style="padding: 20px;">
        <!-- Email Wrapper Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="email-wrapper" style="background-color: ${config.wrapper?.background || '#A68626'}; border-radius: ${config.wrapper?.borderRadius || '36px'}; position: relative;">
          <tr>
            <td class="email-wrapper-padding" style="padding: ${config.wrapper?.padding || '24px'}; position: relative;">
              <!-- Email Content Container -->
              <table role="presentation" width="${config.container.width}" cellpadding="0" cellspacing="0" border="0" class="email-container card-bg" style="max-width: ${config.container.width}; background-color: ${config.container.background}; border-radius: ${config.container.borderRadius}; position: relative;">
                ${topOverlayImageUrl ? (() => {
                  // Calculate overlay margin - use wrapper padding if marginTop is 0px or empty
                  const overlayMargin = (config.wrapper?.marginTop && config.wrapper.marginTop !== '0px') 
                    ? config.wrapper.marginTop 
                    : (config.wrapper?.padding || '24px');
                  const marginValue = parseInt(overlayMargin) || 24;
                  return `
                <!-- Top Overlay Image - Positioned to overlay container, ignoring container padding -->
                <tr>
                  <td align="center" style="padding: 0; line-height: 0; position: relative;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: -${marginValue}px; margin-bottom: -${marginValue}px; position: relative; z-index: 10;">
                      <tr>
                        <td align="center" style="padding: 0;">
                          <img src="${topOverlayImageUrl}" alt="" style="width: 560px; max-width: 560px; height: auto; display: block;" class="top-overlay-image" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `;
                })() : ''}
                <tr>
                  <td class="email-content" style="padding-top: ${config.container.paddingTop} !important; padding-right: ${config.container.padding} !important; padding-bottom: ${config.container.padding} !important; padding-left: ${config.container.padding} !important; position: relative; z-index: 1;">
                    <!-- Content Wrapper Table - sections are <tr> elements so they need to be in a table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${heroSection}
                      ${contextSection}
                      ${infoCardSection}
                      ${rsvpCodeSection}
                      ${ctaSection}
                      ${secondaryInfoSection}
                      ${signoffSection}
                      ${footerSection}
              </table>
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

  return html;
}

/**
 * Generate complete email HTML with header, content, and footer
 * Unified function that handles all styles through the definitive template
 * @param {string} content - Email content
 * @param {string} style - Template style ('elegant', 'modern', 'friendly')
 * @param {Object} options - Template options (may include fallbackMode)
 */
function generateEmailHTML(content, style = 'elegant', options = {}) {
  // Extract fallbackMode from options
  const fallbackMode = options.fallbackMode === true;
  // Pass the style parameter to generateDefinitiveEmailHTML
  // Missing properties in the selected style will fall back to elegant defaults
  return generateDefinitiveEmailHTML(content, options, style, fallbackMode);
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
  extractTopOverlayImage,
  extractHeroImage,
  extractPreheader,
  extractHeroSubtitle,
  extractInfoCardConfig,
  extractRsvpCodeToggle,
  extractSecondaryInfo,
  extractEmailTitle,
  extractButton,
  calculateTitleFontSize,
  loadLogoHtml,
  getAvailableStyles,
  getTemplateConfig,
  EMAIL_TEMPLATES
};
