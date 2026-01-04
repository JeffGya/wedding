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
 * Parse condition string into operator and operands (matches backend implementation)
 * @param {string} condition - Condition string to parse
 * @returns {Object|null} Parsed condition object or null if invalid
 */
function parseCondition(condition) {
  const trimmed = condition.trim();
  
  // Try strict equality operators first (===, !==)
  if (trimmed.includes('===')) {
    const parts = trimmed.split('===').map(s => s.trim().replace(/['"]/g, ''));
    if (parts.length === 2) {
      return { operator: '===', left: parts[0], right: parts[1] };
    }
  }
  
  if (trimmed.includes('!==')) {
    const parts = trimmed.split('!==').map(s => s.trim().replace(/['"]/g, ''));
    if (parts.length === 2) {
      return { operator: '!==', left: parts[0], right: parts[1] };
    }
  }
  
  // Try loose equality operators (==, !=)
  if (trimmed.includes('==')) {
    const parts = trimmed.split('==').map(s => s.trim().replace(/['"]/g, ''));
    if (parts.length === 2) {
      return { operator: '==', left: parts[0], right: parts[1] };
    }
  }
  
  if (trimmed.includes('!=')) {
    const parts = trimmed.split('!=').map(s => s.trim().replace(/['"]/g, ''));
    if (parts.length === 2) {
      return { operator: '!=', left: parts[0], right: parts[1] };
    }
  }
  
  // Simple truthy check (no operator)
  return { operator: 'truthy', left: trimmed, right: null };
}

/**
 * Evaluate conditional expressions (matches backend implementation exactly)
 * @param {string} condition - Condition string to evaluate
 * @param {Object} variables - Template variables
 * @returns {boolean} Evaluation result
 */
function evaluateCondition(condition, variables) {
  const parsed = parseCondition(condition);
  
  if (!parsed) {
    if (import.meta.env.VITE_ENABLE_LOGS === 'true') {
      console.warn('[TEMPLATE_PARSER] Invalid condition format in template', { condition });
    }
    return false;
  }
  
  try {
    if (parsed.operator === '===') {
      return variables[parsed.left] === parsed.right;
    } else if (parsed.operator === '!==') {
      return variables[parsed.left] !== parsed.right;
    } else if (parsed.operator === '==') {
      return variables[parsed.left] == parsed.right; // Loose equality for type coercion
    } else if (parsed.operator === '!=') {
      return variables[parsed.left] != parsed.right; // Loose equality for type coercion
    } else if (parsed.operator === 'truthy') {
      const value = variables[parsed.left];
      
      // Handle different types of values
      if (typeof value === 'boolean') {
        return value;
      } else if (typeof value === 'string') {
        return value.length > 0 && value !== 'null' && value !== 'undefined';
      } else if (typeof value === 'number') {
        return value !== 0;
      } else if (Array.isArray(value)) {
        return value.length > 0;
      } else {
        return !!value; // Default truthy check
      }
    }
    
    return false;
  } catch (error) {
    if (import.meta.env.VITE_ENABLE_LOGS === 'true') {
      console.warn('[TEMPLATE_PARSER] Error evaluating condition in template', { condition, error: error.message });
    }
    return false;
  }
}

/**
 * Process conditional blocks with proper nested block handling (matches backend implementation)
 * Uses recursive parser that tracks block depth to correctly match opening/closing tags
 * @param {string} text - Template content
 * @param {Object} variables - Template variables
 * @returns {string} Processed template with conditionals evaluated
 */
function processConditionalBlocks(text, variables = {}) {
  if (!text) return '';
  
  const enableLogs = import.meta.env.VITE_ENABLE_LOGS === 'true';
  let result = '';
  let i = 0;
  
  while (i < text.length) {
    // Look for {{#if or {{#unless
    const ifStart = text.indexOf('{{#if', i);
    const unlessStart = text.indexOf('{{#unless', i);
    
    // Find the earliest conditional block start
    let blockStart = -1;
    let isUnless = false;
    if (ifStart !== -1 && unlessStart !== -1) {
      blockStart = Math.min(ifStart, unlessStart);
      isUnless = unlessStart < ifStart;
    } else if (ifStart !== -1) {
      blockStart = ifStart;
      isUnless = false;
    } else if (unlessStart !== -1) {
      blockStart = unlessStart;
      isUnless = true;
    }
    
    if (blockStart === -1) {
      // No more conditionals, append rest of template
      result += text.substring(i);
      break;
    }
    
    // Append content before the conditional
    result += text.substring(i, blockStart);
    
    // Find the condition and opening brace end
    const searchStart = blockStart + (isUnless ? 10 : 6); // After "{{#if" or "{{#unless"
    const conditionEnd = text.indexOf('}}', searchStart);
    if (conditionEnd === -1) {
      // Malformed block, append as-is
      if (enableLogs) {
        console.warn('[TEMPLATE_PARSER] Warning: Malformed block found, missing closing }}', { position: blockStart });
      }
      result += text.substring(blockStart);
      break;
    }
    
    const condition = text.substring(searchStart, conditionEnd).trim();
    
    // Find the matching {{/if}} or {{/unless}} by tracking depth
    let depth = 1;
    let contentStart = conditionEnd + 2;
    let contentEnd = contentStart;
    let elseIndex = -1;
    let elseDepth = -1;
    
    while (depth > 0 && contentEnd < text.length) {
      const nextIf = text.indexOf('{{#if', contentEnd);
      const nextUnless = text.indexOf('{{#unless', contentEnd);
      const nextElse = text.indexOf('{{else}}', contentEnd);
      const nextEndIf = text.indexOf('{{/if}}', contentEnd);
      const nextEndUnless = text.indexOf('{{/unless}}', contentEnd);
      
      // Find the earliest of these
      const positions = [
        nextIf !== -1 ? nextIf : Infinity,
        nextUnless !== -1 ? nextUnless : Infinity,
        nextElse !== -1 ? nextElse : Infinity,
        nextEndIf !== -1 ? nextEndIf : Infinity,
        nextEndUnless !== -1 ? nextEndUnless : Infinity
      ];
      const minPos = Math.min(...positions);
      
      if (minPos === Infinity) {
        // No more tags found, unmatched block
        if (enableLogs) {
          console.warn('[TEMPLATE_PARSER] Warning: Unmatched block tag', { condition, isUnless, position: blockStart });
        }
        result += text.substring(blockStart);
        return result;
      }
      
      if (minPos === nextIf || minPos === nextUnless) {
        // Found nested block
        depth++;
        contentEnd = minPos + (minPos === nextUnless ? 10 : 6);
      } else if ((minPos === nextEndIf && !isUnless) || (minPos === nextEndUnless && isUnless)) {
        // Found matching closing tag ({{/if}} for {{#if}}, {{/unless}} for {{#unless}})
        depth--;
        if (depth === 0) {
          contentEnd = minPos;
          break;
        }
        contentEnd = minPos + (minPos === nextEndUnless ? 11 : 7);
      } else if (minPos === nextEndIf && isUnless) {
        // Found {{/if}} but we're looking for {{/unless}}, skip it (might be nested)
        depth--;
        if (depth === 0) {
          // This shouldn't happen, but handle gracefully
          if (enableLogs) {
            console.warn('[TEMPLATE_PARSER] Warning: Found {{/if}} for {{#unless}} block', { condition, position: minPos });
          }
          contentEnd = minPos;
          break;
        }
        contentEnd = minPos + 7;
      } else if (minPos === nextEndUnless && !isUnless) {
        // Found {{/unless}} but we're looking for {{/if}}, skip it (might be nested)
        depth--;
        if (depth === 0) {
          // This shouldn't happen, but handle gracefully
          if (enableLogs) {
            console.warn('[TEMPLATE_PARSER] Warning: Found {{/unless}} for {{#if}} block', { condition, position: minPos });
          }
          contentEnd = minPos;
          break;
        }
        contentEnd = minPos + 11;
      } else if (minPos === nextElse && depth === 1) {
        // Found else at current level (depth 1)
        elseIndex = nextElse;
        elseDepth = depth;
        contentEnd = nextElse + 8;
      } else {
        // Else at deeper level, skip it
        contentEnd = minPos + 8;
      }
    }
    
    if (depth === 0) {
      // Found matching closing tag
      const ifContent = text.substring(contentStart, elseIndex !== -1 ? elseIndex : contentEnd);
      const elseContent = elseIndex !== -1 ? text.substring(elseIndex + 8, contentEnd) : '';
      
      // Evaluate condition (negate if unless)
      const conditionResult = isUnless ? !evaluateCondition(condition, variables) : evaluateCondition(condition, variables);
      
      const selectedContent = conditionResult ? ifContent : elseContent;
      
      // Recursively process nested conditionals in the selected content
      const processedContent = processConditionalBlocks(selectedContent, variables);
      
      result += processedContent;
      
      // Move past closing tag ({{/if}} or {{/unless}})
      i = contentEnd + (isUnless ? 11 : 7);
    } else {
      // No matching closing tag, append as-is
      if (enableLogs) {
        console.warn('[TEMPLATE_PARSER] Warning: Unmatched {{#if}} tag', { condition, position: blockStart });
      }
      result += text.substring(blockStart);
      break;
    }
  }
  
  return result;
}

/**
 * Convert plain text to HTML paragraphs with UnoCSS styling
 */
function convertTextToHtml(text, variables = {}) {
  // First process conditional blocks
  text = processConditionalBlocks(text, variables);
  
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
 * Get sample variables for template preview
 */
export function getSampleVariables() {
  return {
    // Guest Properties
    guestName: 'John Doe',
    groupLabel: 'Bride\'s Family',
    code: 'ABC123',
    rsvpCode: 'ABC123', // Alias for code
    rsvpLink: 'https://example.com/rsvp/ABC123',
    plusOneName: 'Jane Doe',
    rsvpDeadline: 'December 1, 2024',
    email: 'john@example.com',
    preferredLanguage: 'en',
    attending: true,
    rsvp_status: 'attending',
    responded_at: '2024-11-15',
    can_bring_plus_one: true,
    dietary: 'Vegetarian',
    notes: 'Will arrive early to help with setup',
    
    // Conditional Flags
    hasPlusOne: true,
    isPlusOne: false,
    hasResponded: true,
    isAttending: true,
    isNotAttending: false,
    isPending: false,
    isBrideFamily: true,
    isGroomFamily: false,
    isEnglishSpeaker: true,
    isLithuanianSpeaker: false,
    
    // System Properties
    siteUrl: 'https://ourwedding.com', // Uses website_url from settings, falls back to SITE_URL env var
    websiteUrl: 'https://ourwedding.com', // Alias for siteUrl (uses website_url from settings, falls back to SITE_URL env var)
    weddingDate: 'December 15, 2024',
    venueName: 'Beautiful Gardens',
    venueAddress: '123 Wedding Lane, City, State',
    eventStartDate: 'December 15, 2024',
    eventEndDate: 'December 15, 2024',
    eventTime: '4:00 PM',
    brideName: 'Brigita',
    groomName: 'Jeffrey',
    contactEmail: 'hello@ourwedding.com',
    contactPhone: '+1 (555) 123-4567',
    rsvpDeadlineDate: 'December 1, 2024',
    eventType: 'Wedding Ceremony & Reception',
    dressCode: 'Semi-Formal',
    specialInstructions: 'Please arrive 30 minutes early',
    appTitle: 'Brigita & Jeffrey\'s Wedding',
    senderName: 'Brigita & Jeffrey',
    senderEmail: 'hello@ourwedding.com',
    currentDate: new Date().toLocaleDateString(),
    daysUntilWedding: '30 days'
  };
}

/**
 * Get template preview with sample data
 */
export function getTemplatePreviewWithSample(template, preferHtml = true) {
  const sampleVariables = getSampleVariables();
  
  if (preferHtml && hasHtmlVersion(template)) {
    return processConditionalBlocks(template.html, sampleVariables);
  }
  
  const body = template.body_en || template.body_lt;
  return processConditionalBlocks(body, sampleVariables);
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