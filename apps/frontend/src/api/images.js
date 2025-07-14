import api from './index';

/**
 * Fetch all images.
 * @returns {Promise<Array>} Array of image objects.
 */
export async function fetchImages() {
  const { data } = await api.get('/admin/images', {
    meta: { showLoader: true }
  });
  return data;
}

/**
 * Upload an image file.
 * @param {File} file - The image file to upload.
 * @returns {Promise<Object>} Uploaded image object.
 */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post('/admin/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    meta: { showLoader: true }
  });
  return data;
}

/**
 * Update image metadata.
 * @param {number} id - The ID of the image to update.
 * @param {Object} payload - Object containing alt_text and/or filename.
 * @param {string} [payload.alt_text] - New alt text.
 * @param {string} [payload.filename] - New filename (without extension).
 * @returns {Promise<Object>} Updated image object.
 */
export async function updateImage(id, payload) {
  const { data } = await api.put(`/admin/images/${id}`, payload, {
    meta: { showLoader: true }
  });
  return data;
}

/**
 * Delete an image.
 * @param {number} id - The ID of the image to delete.
 * @returns {Promise<boolean>} True if deletion succeeded.
 */
export async function deleteImage(id) {
  await api.delete(`/admin/images/${id}`, {
    meta: { showLoader: true }
  });
  return true;
}