const { DateTime } = require('luxon');
const getDbConnection = require('../db/connection');
const getSenderInfo = require('../helpers/getSenderInfo');
const logger = require('../helpers/logger');

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
 * Process conditional blocks like {{#if condition}}...{{/if}}
 */
function processConditionalBlocks(template, vars) {
  // Handle {{#if condition}}...{{/if}} blocks
  template = template.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
    return evaluateCondition(condition, vars) ? content : '';
  });
  
  // Handle {{#if condition}}...{{else}}...{{/if}} blocks
  template = template.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, ifContent, elseContent) => {
    return evaluateCondition(condition, vars) ? ifContent : elseContent;
  });
  
  return template;
}

/**
 * Evaluate conditional expressions
 */
function evaluateCondition(condition, vars) {
  // Handle simple boolean checks
  if (condition.includes('===')) {
    const [key, value] = condition.split('===').map(s => s.trim());
    return vars[key] === value;
  }
  
  if (condition.includes('!==')) {
    const [key, value] = condition.split('!==').map(s => s.trim());
    return vars[key] !== value;
  }
  
  // Handle simple truthy checks
  const key = condition.trim();
  return !!vars[key];
}

/**
 * Get comprehensive template variables for a guest
 */
async function getTemplateVariables(guest, template = null) {
  const db = getDbConnection();
  const SITE_URL = process.env.SITE_URL || 'http://localhost:5001';
  
  // Get system settings
  const settings = await getSystemSettings(db);
  const senderInfo = await getSenderInfo(db);
  
  // Determine if guest is a plus one based on group label
  const isPlusOne = guest.group_label && guest.group_label.toLowerCase().includes('plus one');
  
  // Determine if guest can bring plus one (not a plus one themselves and has permission)
  const canBringPlusOne = !isPlusOne && guest.can_bring_plus_one;
  
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
  
  const variables = {
    // Guest Properties
    guestName: guest.name,
    groupLabel: guest.group_label || '',
    code: guest.code,
    rsvpLink: `${SITE_URL}/${guest.preferred_language}/rsvp/${guest.code}`,
    plusOneName: '', // Plus one name would be stored separately or in notes
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
    hasPlusOne: false, // This would be determined by checking if they've added a plus one
    isPlusOne: isPlusOne, // New variable to indicate if this guest is a plus one
    hasResponded,
    isAttending,
    isNotAttending,
    isPending,
    isBrideFamily,
    isGroomFamily,
    isEnglishSpeaker,
    isLithuanianSpeaker,
    
    // System Properties
    siteUrl: SITE_URL,
    weddingDate: settings.wedding_date ? formatDate(settings.wedding_date) : '',
    venueName: settings.venue_name || '',
    venueAddress: settings.venue_address || '',
    eventStartDate: settings.event_start_date ? formatDate(settings.event_start_date) : '',
    eventEndDate: settings.event_end_date ? formatDate(settings.event_end_date) : '',
    eventTime: settings.event_time || '',
    brideName: settings.bride_name || '',
    groomName: settings.groom_name || '',
    contactEmail: settings.contact_email || '',
    contactPhone: settings.contact_phone || '',
    rsvpDeadlineDate: settings.rsvp_deadline ? formatDate(settings.rsvp_deadline) : '',
    eventType: settings.event_type || '',
    dressCode: settings.dress_code || '',
    specialInstructions: settings.special_instructions || '',
    websiteUrl: settings.website_url || SITE_URL,
    appTitle: settings.app_title || 'Wedding Site',
    senderName: senderInfo.name,
    senderEmail: senderInfo.email,
    currentDate: new Date().toLocaleDateString(),
    daysUntilWedding: daysUntilWedding ? `${daysUntilWedding} days` : '',
    
    // Legacy variables for backward compatibility
    name: guest.name,
    groupLabel: guest.group_label || '',
    code: guest.code,
    rsvpLink: `${SITE_URL}/${guest.preferred_language}/rsvp/${guest.code}`
  };
  
  return variables;
}

/**
 * Get system settings from database
 */
async function getSystemSettings(db) {
  try {
    if (process.env.DB_TYPE === 'mysql') {
      const [settingsRows] = await db.query('SELECT * FROM settings LIMIT 1');
      const [guestSettingsRows] = await db.query('SELECT * FROM guest_settings LIMIT 1');
      
      const settings = settingsRows[0] || {};
      const guestSettings = guestSettingsRows[0] || {};
      
      return {
        ...settings,
        rsvp_deadline: guestSettings.rsvp_deadline
      };
    } else {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM settings LIMIT 1', (err, settingsRow) => {
          if (err) {
            reject(err);
            return;
          }
          db.get('SELECT * FROM guest_settings LIMIT 1', (err, guestSettingsRow) => {
            if (err) {
              reject(err);
              return;
            }
            const settings = settingsRow || {};
            const guestSettings = guestSettingsRow || {};
            resolve({
              ...settings,
              rsvp_deadline: guestSettings.rsvp_deadline
            });
          });
        });
      });
    }
  } catch (err) {
    logger.error('Error fetching system settings:', err);
    return {};
  }
}

/**
 * Format RSVP deadline date
 */
function formatRsvpDeadline(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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
    rsvpLink: "Full RSVP URL with language",
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
    siteUrl: "Base site URL",
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
    websiteUrl: "Website URL",
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
  evaluateCondition
}; 