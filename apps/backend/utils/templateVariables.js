const { DateTime } = require('luxon');
const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const getSenderInfo = require('../helpers/getSenderInfo');
const logger = require('../helpers/logger');
const { formatDateWithoutTime, formatRsvpDeadline } = require('./dateFormatter');

/**
 * System settings cache with TTL (5 minutes)
 */
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
let settingsCache = {
  data: null,
  timestamp: null,
  senderInfo: null,
  senderInfoTimestamp: null
};

/**
 * Clear the system settings cache
 * Call this when settings are updated
 */
function clearSettingsCache() {
  settingsCache = {
    data: null,
    timestamp: null,
    senderInfo: null,
    senderInfoTimestamp: null
  };
}

/**
 * Get system settings from cache or database
 * @param {Object} db - Database connection
 * @returns {Promise<Object>} System settings object
 */
async function getSystemSettings(db) {
  const now = Date.now();
  
  // Check if cache is valid
  if (settingsCache.data && settingsCache.timestamp && (now - settingsCache.timestamp) < SETTINGS_CACHE_TTL) {
    return settingsCache.data;
  }
  
  try {
    const { dbGet } = createDbHelpers(db);
    const settings = await dbGet('SELECT * FROM settings LIMIT 1') || {};
    const guestSettings = await dbGet('SELECT * FROM guest_settings LIMIT 1') || {};
    
    const mergedSettings = {
      ...settings,
      rsvp_deadline: guestSettings.rsvp_deadline
    };
    
    // Update cache
    settingsCache.data = mergedSettings;
    settingsCache.timestamp = now;
    
    return mergedSettings;
  } catch (err) {
    logger.error('Error fetching system settings:', err);
    return {};
  }
}

/**
 * Get sender info from cache or database
 * @param {Object} db - Database connection
 * @returns {Promise<string>} Sender info string
 */
async function getCachedSenderInfo(db) {
  const now = Date.now();
  
  // Check if cache is valid
  if (settingsCache.senderInfo !== null && settingsCache.senderInfoTimestamp && (now - settingsCache.senderInfoTimestamp) < SETTINGS_CACHE_TTL) {
    return settingsCache.senderInfo;
  }
  
  try {
    const senderInfoString = await getSenderInfo(db);
    settingsCache.senderInfo = senderInfoString;
    settingsCache.senderInfoTimestamp = now;
    return senderInfoString;
  } catch (err) {
    logger.error('Error fetching sender info:', err);
    return '';
  }
}

/**
 * Enhanced template variable replacement with conditional logic
 */
function replaceTemplateVars(template, vars) {
  if (!template) return '';
  
  // First, handle conditional blocks
  template = processConditionalBlocks(template, vars);
  
  // Then, replace simple variables
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    return vars[key] !== undefined ? vars[key] : '';
  });
}

/**
 * Parse condition string into operator and operands
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
 * Evaluate conditional expressions with enhanced logic
 * @param {string} condition - Condition string to evaluate
 * @param {Object} vars - Template variables
 * @returns {boolean} Evaluation result
 */
function evaluateCondition(condition, vars) {
  const parsed = parseCondition(condition);
  
  if (!parsed) {
    logger.warn('Invalid condition format in template', { condition });
    return false;
  }
  
  try {
    if (parsed.operator === '===') {
      return vars[parsed.left] === parsed.right;
    } else if (parsed.operator === '!==') {
      return vars[parsed.left] !== parsed.right;
    } else if (parsed.operator === '==') {
      return vars[parsed.left] == parsed.right; // Loose equality for type coercion
    } else if (parsed.operator === '!=') {
      return vars[parsed.left] != parsed.right; // Loose equality for type coercion
    } else if (parsed.operator === 'truthy') {
      const value = vars[parsed.left];
      
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
    logger.warn('Error evaluating condition in template', { condition, error: error.message });
    return false;
  }
}

/**
 * Process conditional blocks like {{#if condition}}...{{/if}} with proper nested block handling
 * Uses recursive parser that tracks block depth to correctly match opening/closing tags
 * @param {string} template - Template content
 * @param {Object} vars - Template variables
 * @returns {string} Processed template with conditionals evaluated
 */
function processConditionalBlocks(template, vars) {
  if (!template) return '';
  
  let result = '';
  let i = 0;
  
  while (i < template.length) {
    // Look for {{#if or {{#unless
    const ifStart = template.indexOf('{{#if', i);
    const unlessStart = template.indexOf('{{#unless', i);
    
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
      result += template.substring(i);
      break;
    }
    
    // Append content before the conditional
    result += template.substring(i, blockStart);
    
    // Find the condition and opening brace end
    const searchStart = blockStart + (isUnless ? 10 : 6); // After "{{#if" or "{{#unless"
    const conditionEnd = template.indexOf('}}', searchStart);
    if (conditionEnd === -1) {
      // Malformed block, append as-is
      logger.warn('[TEMPLATE_PARSER] Warning: Malformed block found, missing closing }}', { position: blockStart });
      result += template.substring(blockStart);
      break;
    }
    
    const condition = template.substring(searchStart, conditionEnd).trim();
    
    // Find the matching {{/if}} or {{/unless}} by tracking depth
    let depth = 1;
    let contentStart = conditionEnd + 2;
    let contentEnd = contentStart;
    let elseIndex = -1;
    let elseDepth = -1;
    
    while (depth > 0 && contentEnd < template.length) {
      const nextIf = template.indexOf('{{#if', contentEnd);
      const nextUnless = template.indexOf('{{#unless', contentEnd);
      const nextElse = template.indexOf('{{else}}', contentEnd);
      const nextEndIf = template.indexOf('{{/if}}', contentEnd);
      const nextEndUnless = template.indexOf('{{/unless}}', contentEnd);
      
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
        logger.warn('[TEMPLATE_PARSER] Warning: Unmatched block tag', { condition, isUnless, position: blockStart });
        result += template.substring(blockStart);
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
          logger.warn('[TEMPLATE_PARSER] Warning: Found {{/if}} for {{#unless}} block', { condition, position: minPos });
          contentEnd = minPos;
          break;
        }
        contentEnd = minPos + 7;
      } else if (minPos === nextEndUnless && !isUnless) {
        // Found {{/unless}} but we're looking for {{/if}}, skip it (might be nested)
        depth--;
        if (depth === 0) {
          // This shouldn't happen, but handle gracefully
          logger.warn('[TEMPLATE_PARSER] Warning: Found {{/unless}} for {{#if}} block', { condition, position: minPos });
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
      const ifContent = template.substring(contentStart, elseIndex !== -1 ? elseIndex : contentEnd);
      const elseContent = elseIndex !== -1 ? template.substring(elseIndex + 8, contentEnd) : '';
      
      // Evaluate condition (negate if unless)
      const conditionResult = isUnless ? !evaluateCondition(condition, vars) : evaluateCondition(condition, vars);
      
      const selectedContent = conditionResult ? ifContent : elseContent;
      
      // Recursively process nested conditionals in the selected content
      const processedContent = processConditionalBlocks(selectedContent, vars);
      
      result += processedContent;
      
      // Move past closing tag ({{/if}} or {{/unless}})
      i = contentEnd + (isUnless ? 11 : 7);
    } else {
      // No matching closing tag, append as-is
      logger.warn('[TEMPLATE_PARSER] Warning: Unmatched {{#if}} tag', { condition, position: blockStart });
      result += template.substring(blockStart);
      break;
    }
  }
  
  return result;
}

/**
 * Check if a guest has a plus one
 */
async function checkIfGuestHasPlusOne(db, guestId) {
  try {
    const { dbGet } = createDbHelpers(db);
    const row = await dbGet(
      'SELECT COUNT(*) as count FROM guests WHERE group_id = (SELECT group_id FROM guests WHERE id = ?) AND is_primary = 0',
      [guestId]
    );
    return row?.count > 0;
  } catch (err) {
    logger.error('Error checking plus one status:', err);
    return false;
  }
}

/**
 * Get the plus one's name for a guest
 */
async function getPlusOneName(db, guestId) {
  try {
    const { dbGet } = createDbHelpers(db);
    const row = await dbGet(
      'SELECT name FROM guests WHERE group_id = (SELECT group_id FROM guests WHERE id = ?) AND is_primary = 0 LIMIT 1',
      [guestId]
    );
    return row?.name || '';
  } catch (err) {
    logger.error('Error getting plus one name:', err);
    return '';
  }
}

/**
 * Check if template content uses plus-one variables
 * @param {string} templateContent - Template content to check
 * @returns {boolean} True if template uses plus-one variables
 */
function templateUsesPlusOneVars(templateContent) {
  if (!templateContent) return false;
  const plusOneVars = ['plusOneName', 'plus_one_name', 'hasPlusOne', 'has_plus_one'];
  return plusOneVars.some(varName => templateContent.includes(`{{${varName}}}`) || templateContent.includes(`{{#if ${varName}}}`));
}

/**
 * Get comprehensive template variables for a guest
 */
async function getTemplateVariables(guest, template = null) {
  const db = getDbConnection();
  const SITE_URL = process.env.SITE_URL || 'http://localhost:5001';
  
  // Get system settings from cache
  const settings = await getSystemSettings(db);
  const senderInfoString = await getCachedSenderInfo(db);
  
  // Check if we need plus-one data (lazy loading)
  const templateContent = template ? (template.body_en || template.body_lt || template.body || '') : '';
  const needsPlusOneData = templateUsesPlusOneVars(templateContent);
  
  // Parse senderInfo string (format: "Name <email@example.com>")
  let senderName = '';
  let senderEmail = '';
  if (senderInfoString) {
    const match = senderInfoString.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      senderName = match[1].trim();
      senderEmail = match[2].trim();
    } else {
      // Fallback: if no angle brackets, treat entire string as name
      senderName = senderInfoString.trim();
    }
  }
  
  // Determine if guest is a plus one based on group label
  const isPlusOne = guest.group_label && guest.group_label.toLowerCase().includes('plus one');
  
  // Determine if guest can bring plus one (not a plus one themselves and has permission)
  const canBringPlusOne = !isPlusOne && guest.can_bring_plus_one;
  
  // Get plus one information (lazy load - only if needed)
  let hasPlusOne = false;
  let plusOneName = '';
  
  if (needsPlusOneData) {
    hasPlusOne = await checkIfGuestHasPlusOne(db, guest.id);
    plusOneName = await getPlusOneName(db, guest.id);
  }
  
  // Calculate derived values
  const hasResponded = guest.responded_at !== null;
  const isAttending = guest.rsvp_status === 'attending';
  const isNotAttending = guest.rsvp_status === 'not_attending';
  const isPending = guest.rsvp_status === 'pending';
  const isBrideFamily = guest.group_label === 'Bride\'s Family';
  const isGroomFamily = guest.group_label === 'Groom\'s Family';
  const isEnglishSpeaker = guest.preferred_language === 'en';
  const isLithuanianSpeaker = guest.preferred_language === 'lt';
  
  // Calculate days until wedding
  const daysUntilWedding = settings.wedding_date ? 
    Math.ceil((new Date(settings.wedding_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  
  // Get the site URL from settings, fallback to environment variable
  const siteUrl = settings.website_url || SITE_URL;
  
  const variables = {
    // Guest Properties
    guestName: guest.name,
    groupLabel: guest.group_label || '',
    code: guest.code,
    rsvpCode: guest.code, // Alias for clarity
    rsvpLink: `${siteUrl}/${guest.preferred_language}/rsvp/${guest.code}`,
    plusOneName: plusOneName,
    plus_one_name: plusOneName, // Alias for template compatibility (snake_case)
    rsvpDeadline: formatRsvpDeadline(guest.rsvp_deadline),
    email: guest.email,
    preferredLanguage: guest.preferred_language,
    attending: guest.attending,
    rsvp_status: guest.rsvp_status,
    responded_at: guest.responded_at,
    can_bring_plus_one: canBringPlusOne,
    dietary: guest.dietary,
    notes: guest.notes,
    
    // Conditional Flags
    hasPlusOne: hasPlusOne,
    has_plus_one: hasPlusOne, // Alias for template compatibility (snake_case)
    isPlusOne: isPlusOne,
    hasResponded,
    isAttending,
    isNotAttending,
    isPending,
    isBrideFamily,
    isGroomFamily,
    isEnglishSpeaker,
    isLithuanianSpeaker,
    
    // System Properties
    siteUrl: siteUrl, // Uses website_url from settings, falls back to SITE_URL env var
    websiteUrl: siteUrl, // Alias for siteUrl (uses website_url from settings, falls back to SITE_URL env var)
    weddingDate: settings.wedding_date ? formatDateWithoutTime(settings.wedding_date) : '',
    venueName: settings.venue_name || '',
    venueAddress: settings.venue_address || '',
    eventStartDate: settings.event_start_date ? formatDateWithoutTime(settings.event_start_date) : '',
    eventEndDate: settings.event_end_date ? formatDateWithoutTime(settings.event_end_date) : '',
    eventTime: settings.event_time || '',
    brideName: settings.bride_name || '',
    groomName: settings.groom_name || '',
    contactEmail: settings.contact_email || '',
    contactPhone: settings.contact_phone || '',
    rsvpDeadlineDate: settings.rsvp_deadline ? formatDateWithoutTime(settings.rsvp_deadline) : '',
    eventType: settings.event_type || '',
    dressCode: settings.dress_code || '',
    specialInstructions: settings.special_instructions || '',
    appTitle: settings.app_title || 'Wedding Site',
    senderName: senderName,
    senderEmail: senderEmail,
    currentDate: new Date().toLocaleDateString(),
    daysUntilWedding: daysUntilWedding ? `${daysUntilWedding} days` : '',
    
    // Legacy variables for backward compatibility (only variables not already in main section)
    name: guest.name // Alias for guestName
  };
  
  return variables;
}



/**
 * Get available template variables for documentation
 */
function getAvailableVariables() {
  return {
    // Guest Properties
    guestName: "Guest's full name",
    groupLabel: "Group label (e.g., 'Bride's Family')",
    code: "Unique RSVP code",
    rsvpCode: "Unique RSVP code (alias for code)",
    rsvpLink: "Full RSVP URL with language (uses website_url from settings)",
    plusOneName: "Plus one's name (if applicable)",
    rsvpDeadline: "Formatted deadline date",
    email: "Guest's email address",
    preferredLanguage: "Guest's preferred language ('en' or 'lt')",
    attending: "Boolean indicating if guest is attending",
    rsvp_status: "RSVP status ('pending', 'attending', 'not_attending')",
    responded_at: "When guest responded to RSVP",
    can_bring_plus_one: "Boolean indicating if guest can bring plus one",
    dietary: "Dietary requirements",
    notes: "Guest notes",
    
    // Conditional Flags
    hasPlusOne: "Boolean: true if guest has plus one",
    hasResponded: "Boolean: true if guest has responded",
    isAttending: "Boolean: true if guest is attending",
    isNotAttending: "Boolean: true if guest is not attending",
    isPending: "Boolean: true if guest hasn't responded",
    isBrideFamily: "Boolean: true if guest is bride's family",
    isGroomFamily: "Boolean: true if guest is groom's family",
    isEnglishSpeaker: "Boolean: true if guest prefers English",
    isLithuanianSpeaker: "Boolean: true if guest prefers Lithuanian",
    
    // System Properties
    siteUrl: "Base site URL (uses website_url from settings, falls back to SITE_URL env var)",
    websiteUrl: "Website URL (alias for siteUrl, uses website_url from settings, falls back to SITE_URL env var)",
    weddingDate: "Wedding date from settings",
    venueName: "Venue name",
    venueAddress: "Full venue address",
    eventStartDate: "Event start date",
    eventEndDate: "Event end date",
    eventTime: "Event time",
    brideName: "Bride's name",
    groomName: "Groom's name",
    contactEmail: "Contact email",
    contactPhone: "Contact phone",
    rsvpDeadlineDate: "RSVP deadline date (from guest settings)",
    eventType: "Type of event",
    dressCode: "Dress code",
    specialInstructions: "Special instructions for guests",
    appTitle: "App title",
    senderName: "Sender name from email settings",
    senderEmail: "Sender email from email settings",
    currentDate: "Current date",
    daysUntilWedding: "Days until wedding"
  };
}

module.exports = {
  replaceTemplateVars,
  getTemplateVariables,
  getAvailableVariables,
  processConditionalBlocks,
  evaluateCondition,
  checkIfGuestHasPlusOne,
  getPlusOneName,
  getSystemSettings,
  clearSettingsCache
}; 