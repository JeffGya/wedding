// src/api/publicSurveys.js
import http from './index';

/**
 * Fetch a public survey definition by ID
 * @param {number} surveyId
 * @returns {Promise<Object>} survey object
 */
export function fetchPublicSurveyById(surveyId) {
  return http
    .get(`/public/surveys/${surveyId}`)
    .then(res => res.data);
}

/**
 * Submit a public survey response
 * @param {number} surveyId
 * @param {Object} payload - { response_text: string | array }
 * @returns {Promise<Object>} response result
 */
export function createSurveyResponse(surveyId, payload) {
  return http
    .post(`/public/surveys/${surveyId}/responses`, payload)
    .then(res => res.data);
}