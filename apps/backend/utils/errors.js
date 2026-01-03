// apps/backend/utils/errors.js

module.exports = {
    // Common error codes
    VALIDATION_ERROR:         'VALIDATION_ERROR',
    NOT_FOUND:                'NOT_FOUND',
    UNAUTHORIZED:             'UNAUTHORIZED',
    FORBIDDEN:                'FORBIDDEN',
    BAD_REQUEST:              'BAD_REQUEST',
    INTERNAL_ERROR:           'INTERNAL_ERROR',
    
    // Existing error codes
    INVALID_BLOCK_TYPE:       'INVALID_BLOCK_TYPE',
    INVALID_BLOCK_DATA:       'INVALID_BLOCK_DATA',
    EMBED_SANITIZATION_FAIL:  'EMBED_SANITIZATION_FAIL',
    SURVEY_NOT_FOUND:         'SURVEY_NOT_FOUND',
    PAGE_NOT_PUBLISHED:       'PAGE_NOT_PUBLISHED',
    RSVP_REQUIRED:            'RSVP_REQUIRED'
  };