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