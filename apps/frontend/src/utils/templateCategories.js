/**
 * Template categories and their metadata
 */
export const TEMPLATE_CATEGORIES = {
  'RSVP Management': {
    id: 'rsvp-management',
    description: 'Templates for RSVP invitations, reminders, and confirmations',
    icon: 'pi pi-calendar-check',
    color: 'primary',
    severity: 'primary',
    templates: [
      'RSVP Invitation',
      'RSVP Reminder'
    ]
  },
  'Event Updates': {
    id: 'event-updates',
    description: 'Templates for wedding updates, schedule changes, and announcements',
    icon: 'pi pi-bell',
    color: 'info',
    severity: 'info',
    templates: [
      'Wedding Update'
    ]
  },
  'Thank You Messages': {
    id: 'thank-you',
    description: 'Templates for thanking guests for RSVPs and attendance',
    icon: 'pi pi-heart',
    color: 'success',
    severity: 'success',
    templates: [
      'Thank You - Attending',
      'Thank You - Not Attending'
    ]
  },
  'Special Communications': {
    id: 'special-communications',
    description: 'Templates for group-specific messages and special occasions',
    icon: 'pi pi-star',
    color: 'warning',
    severity: 'warning',
    templates: [
      'Group-Specific Welcome'
    ]
  },
  'Custom': {
    id: 'custom',
    description: 'Your custom email templates',
    icon: 'pi pi-file-edit',
    color: 'secondary',
    severity: 'secondary',
    templates: []
  }
}

/**
 * Get category for a template name
 */
export function getTemplateCategory(templateName) {
  for (const [categoryName, category] of Object.entries(TEMPLATE_CATEGORIES)) {
    if (category.templates.includes(templateName)) {
      return categoryName
    }
  }
  return 'Custom'
}

/**
 * Get category metadata
 */
export function getCategoryMetadata(categoryName) {
  return TEMPLATE_CATEGORIES[categoryName] || TEMPLATE_CATEGORIES['Custom']
}

/**
 * Get all categories
 */
export function getAllCategories() {
  return Object.keys(TEMPLATE_CATEGORIES)
}

/**
 * Get category color for PrimeVue components
 */
export function getCategoryColor(categoryName) {
  const metadata = getCategoryMetadata(categoryName)
  return metadata.color
}

/**
 * Get category icon
 */
export function getCategoryIcon(categoryName) {
  const metadata = getCategoryMetadata(categoryName)
  return metadata.icon
}

/**
 * Get category severity for PrimeVue components
 */
export function getCategorySeverity(categoryName) {
  const metadata = getCategoryMetadata(categoryName)
  return metadata.severity || 'info'
}

/**
 * Filter templates by category
 */
export function filterTemplatesByCategory(templates, categoryName) {
  if (categoryName === 'all') {
    return templates
  }
  
  if (categoryName === 'Custom') {
    return templates.filter(template => 
      !Object.values(TEMPLATE_CATEGORIES).some(category => 
        category.templates.includes(template.name)
      )
    )
  }
  
  const category = TEMPLATE_CATEGORIES[categoryName]
  if (!category) {
    return templates
  }
  
  return templates.filter(template => 
    category.templates.includes(template.name)
  )
}

/**
 * Get template usage statistics
 */
export function getTemplateStats(templates) {
  const stats = {}
  
  for (const categoryName of getAllCategories()) {
    const categoryTemplates = filterTemplatesByCategory(templates, categoryName)
    stats[categoryName] = categoryTemplates.length
  }
  
  return stats
} 