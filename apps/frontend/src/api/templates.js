import api from './index.js'

/**
 * Fetch all templates
 * @returns {Promise<{success: boolean, templates: Array}>}
 */
export async function fetchTemplates() {
  try {
    const response = await api.get('/templates')
    return response.data
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    throw error
  }
}

/**
 * Fetch a single template by ID
 * @param {number} templateId 
 * @returns {Promise<{success: boolean, template: Object}>}
 */
export async function fetchTemplate(templateId) {
  try {
    const response = await api.get(`/templates/${templateId}`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch template:', error)
    throw error
  }
}

/**
 * Create a new template
 * @param {Object} templateData 
 * @param {string} templateData.name
 * @param {string} templateData.subject
 * @param {string} templateData.body_en
 * @param {string} templateData.body_lt
 * @returns {Promise<{success: boolean, id: number}>}
 */
export async function createTemplate(templateData) {
  try {
    const response = await api.post('/templates', templateData)
    return response.data
  } catch (error) {
    console.error('Failed to create template:', error)
    throw error
  }
}

/**
 * Update an existing template
 * @param {number} templateId 
 * @param {Object} templateData 
 * @returns {Promise<{success: boolean}>}
 */
export async function updateTemplate(templateId, templateData) {
  try {
    const response = await api.put(`/templates/${templateId}`, templateData)
    return response.data
  } catch (error) {
    console.error('Failed to update template:', error)
    throw error
  }
}

/**
 * Delete a template
 * @param {number} templateId 
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteTemplate(templateId) {
  try {
    const response = await api.delete(`/templates/${templateId}`)
    return response.data
  } catch (error) {
    console.error('Failed to delete template:', error)
    throw error
  }
} 

/**
 * Preview template with sample guest data
 * @param {number} templateId 
 * @param {number} guestId - Optional guest ID to use for preview
 * @returns {Promise<{success: boolean, preview: Object, sampleGuests: Array}>}
 */
export async function previewTemplate(templateId, guestId = null) {
  try {
    const params = guestId ? { guestId } : {};
    const response = await api.get(`/templates/${templateId}/preview`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to preview template:', error);
    throw error;
  }
}

/**
 * Get available template variables and sample data
 * @returns {Promise<{success: boolean, variables: Object, sampleGuests: Array}>}
 */
export async function getTemplateVariables() {
  try {
    const response = await api.get('/templates/preview-variables')
    return response.data
  } catch (error) {
    console.error('Failed to get template variables:', error)
    throw error
  }
} 

/**
 * Add new API call to get template styles
 * @returns {Promise<{success: boolean, styles: Array}>}
 */
export async function getTemplateStyles() {
  try {
    const response = await api.get('/templates/styles');
    return response.data;
  } catch (error) {
    console.error('Error fetching template styles:', error);
    throw error;
  }
} 

/**
 * Seed templates with pre-built examples
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function seedTemplates() {
  try {
    const response = await api.post('/templates/seed');
    return response.data;
  } catch (error) {
    console.error('Failed to seed templates:', error);
    throw error;
  }
} 

/**
 * Generate email HTML for preview
 * @param {string} content - The email content
 * @param {string} style - The email style (elegant, modern, friendly)
 * @param {Object} options - Preview options
 * @returns {string} Generated HTML
 */
export function generateEmailHTML(content, style = 'elegant', options = {}) {
  // This is a simplified version for frontend preview
  // The actual email generation happens on the backend
  const {
    title = 'Brigtia & Jeffrey',
    buttonText = 'Visit Our Website',
    buttonUrl = 'https://your-wedding-site.com',
    footerText = 'With love and joy,',
    siteUrl = 'https://your-wedding-site.com'
  } = options

  // For frontend preview, we'll return a basic HTML structure
  // The full email template generation should be done on the backend
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Message Preview</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #F1EFE8; font-family: Arial, Helvetica, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="padding: 30px 25px; background: linear-gradient(135deg, #DAA52080 0%, #E3B13F60 50%, #DAA52080 100%); border: 2px solid #E3B13F40; text-align: center;">
          <h1 style="margin: 0; font-family: 'Great Vibes', cursive; font-size: 42px; color: #442727; font-weight: normal;">
            ${title}
          </h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; background: #E9E7D9; border: 3px solid #DED4C4; border-radius: 12px; box-shadow: 0 6px 20px rgba(68, 39, 39, 0.2);">
          <div style="font-family: 'Lora', serif; font-size: 16px; line-height: 1.6; color: #442727;">
            ${content}
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 25px; background: linear-gradient(135deg, #DAA52080 0%, #E3B13F60 50%, #DAA52080 100%); border: 2px solid #E3B13F40; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-family: 'Lora', serif; font-size: 16px; color: #442727;">
            ${footerText}
          </p>
          <p style="margin: 0 0 15px 0; font-weight: bold; color: #442727;">
            Brigtia & Jeffrey
          </p>
          <p style="margin: 0; font-size: 14px;">
            <a href="${siteUrl}" style="color: #DAA520; text-decoration: none;">
              ${siteUrl}
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
} 