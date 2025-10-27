// apps/backend/utils/blockSchema.js
// Single source of truth for page content blocks:
// - validateBlock: structural/type checks
// - normalizeBlock: default/trim fields
// - sanitizeBlock: strip unsafe HTML/iframes
// - processBlocks: run all steps for an array (admin/public modes)

'use strict';

const sanitizeHtml = require('sanitize-html');
const Joi = require('joi');
const ERRORS = require('./errors');

// -------------------- Config --------------------
const ALLOWED_TYPES = ['rich-text', 'image', 'video', 'divider', 'map', 'survey'];

const ALLOWED_IFRAME_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'www.google.com',
  'maps.google.com',
  'www.instagram.com',
  'instagram.com',
  'tiktok.com',
  'www.tiktok.com',
];

const SANITIZE_HTML_OPTIONS = {
  allowedTags: [
    'p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'hr', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'iframe', 'blockquote', 'script'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy'],
    blockquote: ['class', 'data-instgrm-permalink', 'data-instgrm-version', 'style'],
    script: ['src', 'async'],
    '*': ['style', 'class', 'data-*']
  },
  // Do NOT allow inline event handlers
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    iframe: (tagName, attribs) => {
      // We'll further validate src host below in sanitizeBlock
      return { tagName, attribs };
    }
  },
  // Don't allow unknown protocols/javascript:
  allowProtocolRelative: false,
};

// -------------------- Joi Schemas --------------------
const richTextSchema = Joi.object({
  type: Joi.string().valid('rich-text').required(),
  html: Joi.string().required()
});

const imageSchema = Joi.object({
  type: Joi.string().valid('image').required(),
  src: Joi.string().uri().required(),
  alt: Joi.string().allow('').default('')
});

const embedSchema = Joi.object({
  type: Joi.string().valid('video', 'map').required(),
  embed: Joi.string().required()
});

const dividerSchema = Joi.object({
  type: Joi.string().valid('divider').required()
});

const surveySchema = Joi.object({
  type: Joi.string().valid('survey').required(),
  id: Joi.number().integer().positive().required()
});

// -------------------- Helpers --------------------
function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function toBool(v) {
  return v === true || v === 1 || v === '1';
}

function ensureIframeHost(src) {
  try {
    const url = new URL(src);
    return ALLOWED_IFRAME_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

// -------------------- Validation --------------------
function validateBlock(block) {
  if (!isPlainObject(block)) {
    const err = new Error('Block must be an object.');
    err.code = ERRORS.INVALID_BLOCK_DATA;
    throw err;
  }
  if (!block.type || typeof block.type !== 'string') {
    const err = new Error('Block requires a "type" string.');
    err.code = ERRORS.INVALID_BLOCK_TYPE;
    throw err;
  }
  if (!ALLOWED_TYPES.includes(block.type)) {
    const err = new Error(`Unsupported block type "${block.type}". Allowed: ${ALLOWED_TYPES.join(', ')}`);
    err.code = ERRORS.INVALID_BLOCK_TYPE;
    throw err;
  }

  switch (block.type) {
    case 'rich-text':
      if (typeof block.html !== 'string') {
        const err = new Error('rich-text block requires "html" string.');
        err.code = ERRORS.INVALID_BLOCK_DATA;
        throw err;
      }
      break;

    case 'image':
      if (typeof block.src !== 'string' || !block.src.trim()) {
        const err = new Error('image block requires non-empty "src".');
        err.code = ERRORS.INVALID_BLOCK_DATA;
        throw err;
      }
      // alt optional
      break;

    case 'video':
      if (typeof block.embed !== 'string') {
        const err = new Error('video block requires "embed" string (iframe HTML or URL).');
        err.code = ERRORS.INVALID_BLOCK_DATA;
        throw err;
      }
      break;

    case 'map':
      if (typeof block.embed !== 'string') {
        const err = new Error('map block requires "embed" string (iframe HTML or URL).');
        err.code = ERRORS.INVALID_BLOCK_DATA;
        throw err;
      }
      break;

    case 'divider':
      // nothing required
      break;

    case 'survey':
      if (!Number.isInteger(block.id) || block.id <= 0) {
        const err = new Error('survey block requires numeric positive "id".');
        err.code = ERRORS.INVALID_BLOCK_DATA;
        throw err;
      }
      break;
  }
  return true;
}

// -------------------- Normalization --------------------
function normalizeBlock(block) {
  const b = { ...block };

  switch (b.type) {
    case 'image':
      b.alt = typeof b.alt === 'string' ? b.alt.trim() : '';
      b.src = b.src.trim();
      break;

    case 'rich-text':
      // trim outer whitespace to reduce payload size
      b.html = b.html.trim();
      break;

    case 'video':
    case 'map':
      b.embed = b.embed.trim();
      break;

    case 'survey':
      // nothing extra for now
      break;
  }

  return b;
}

// -------------------- Sanitization --------------------
function sanitizeBlock(block) {
  const b = { ...block };

  if (b.type === 'rich-text') {
    b.html = sanitizeHtml(b.html, SANITIZE_HTML_OPTIONS);
  }

  if (b.type === 'video' || b.type === 'map') {
    // Two cases: full iframe HTML or just URL
    let html = b.embed;

    // If it's a bare URL, wrap it
    const isUrlOnly = /^https?:\/\//i.test(html) && !/<iframe/i.test(html);
    if (isUrlOnly) {
      const urlHost = new URL(html).hostname;
      if (!ensureIframeHost(html)) {
        const err = new Error(`Embed sanitization failed: host "${urlHost}" not allowed`);
        err.code = ERRORS.EMBED_SANITIZATION_FAIL;
        throw err;
      }
      html = `<iframe src="${html}" frameborder="0" allowfullscreen></iframe>`;
    }

    // Sanitize the embed HTML
    const sanitized = sanitizeHtml(html, SANITIZE_HTML_OPTIONS);

    // Check if this is an Instagram embed (blockquote with instagram-media class)
    const isInstagramEmbed = sanitized.includes('instagram-media');
    
    if (isInstagramEmbed) {
      // Instagram embeds use blockquote, not iframe - just sanitize and return
      // Ensure it's actually from Instagram
      if (!sanitized.includes('instagram.com')) {
        const err = new Error('Embed sanitization failed: Instagram embed must originate from instagram.com');
        err.code = ERRORS.EMBED_SANITIZATION_FAIL;
        throw err;
      }
      b.embed = sanitized;
      return b;
    }

    // For non-Instagram embeds, require iframe
    const match = sanitized.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (!match) {
      const err = new Error('Embed sanitization failed: <iframe> tag was stripped or not found');
      err.code = ERRORS.EMBED_SANITIZATION_FAIL;
      throw err;
    }
    const src = match[1];
    const srcHost = new URL(src).hostname;
    if (!ensureIframeHost(src)) {
      const err = new Error(`Embed sanitization failed: host "${srcHost}" not allowed`);
      err.code = ERRORS.EMBED_SANITIZATION_FAIL;
      throw err;
    }

    b.embed = sanitized;
    return b;
  }

  return b;
}

// -------------------- Processor --------------------
/**
 * Process an array of blocks
 * @param {Array} blocks
 * @param {Object} opts
 * @param {'admin'|'public'} [opts.mode='admin']
 * @param {boolean} [opts.skipInvalid=true] - when true, invalid blocks are dropped (public). false -> throw (admin).
 * @returns {{ blocks: Array, errors: Array<{index:number,error:Error}> }}
 */
function processBlocks(blocks, opts = {}) {
  const mode = opts.mode || 'admin';
  const skipInvalid = opts.skipInvalid !== undefined ? opts.skipInvalid : mode === 'public';
  const out = [];
  const errors = [];

  if (!Array.isArray(blocks)) throw new Error('content must be an array of blocks');

  blocks.forEach((blk, i) => {
    try {
      // Base type check:
      validateBlock(blk);

      // Joi validation per schema:
      let validated = (() => {
        switch (blk.type) {
          case 'rich-text':
            return Joi.attempt(blk, richTextSchema);
          case 'image':
            return Joi.attempt(blk, imageSchema);
          case 'video':
          case 'map':
            return Joi.attempt(blk, embedSchema);
          case 'divider':
            return Joi.attempt(blk, dividerSchema);
          case 'survey':
            return Joi.attempt(blk, surveySchema);
          default:
            // Shouldn't happen due to validateBlock, but guard anyway
            throw new Error(`Unsupported block type "${blk.type}".`);
        }
      })();

      // Normalize and sanitize the validated block
      let n = normalizeBlock(validated);
      n = sanitizeBlock(n);
      out.push(n);

    } catch (err) {
      // Record the error
      errors.push({ index: i, error: err });

      // Always insert a placeholder in public mode
      if (skipInvalid) {
        out.push({
          type: 'error',
          index: i,
          originalType: typeof blk.type === 'string' ? blk.type : null,
          message: err.message
        });
      } else {
        // In admin mode, rethrow so we notice failures immediately
        throw err;
      }
    }
  });

  return { blocks: out, errors };
}

module.exports = {
  ALLOWED_TYPES,
  validateBlock,
  normalizeBlock,
  sanitizeBlock,
  processBlocks,
  richTextSchema,
  imageSchema,
  embedSchema,
  dividerSchema,
  surveySchema,
};