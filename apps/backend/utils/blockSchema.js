

// apps/backend/utils/blockSchema.js
// Single source of truth for page content blocks:
// - validateBlock: structural/type checks
// - normalizeBlock: default/trim fields
// - sanitizeBlock: strip unsafe HTML/iframes
// - processBlocks: run all steps for an array (admin/public modes)

'use strict';

const sanitizeHtml = require('sanitize-html');

// -------------------- Config --------------------
const ALLOWED_TYPES = ['rich-text', 'image', 'video', 'divider', 'map', 'survey'];

const ALLOWED_IFRAME_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'player.vimeo.com',
  'www.google.com', // maps
  'maps.google.com',
  'www.google.lt',
  'www.google.lv',
];

const SANITIZE_HTML_OPTIONS = {
  allowedTags: [
    'p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'hr', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'iframe'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy'],
    '*': ['style', 'class']
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
  if (!isPlainObject(block)) throw new Error('Block must be an object.');
  if (!block.type || typeof block.type !== 'string') throw new Error('Block requires a "type" string.');
  if (!ALLOWED_TYPES.includes(block.type)) {
    throw new Error(`Unsupported block type "${block.type}". Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }

  switch (block.type) {
    case 'rich-text':
      if (typeof block.html !== 'string') throw new Error('rich-text block requires "html" string.');
      break;

    case 'image':
      if (typeof block.src !== 'string' || !block.src.trim()) throw new Error('image block requires non-empty "src".');
      // alt optional
      break;

    case 'video':
      if (typeof block.embed !== 'string') throw new Error('video block requires "embed" string (iframe HTML or URL).');
      break;

    case 'map':
      if (typeof block.embed !== 'string') throw new Error('map block requires "embed" string (iframe HTML or URL).');
      break;

    case 'divider':
      // nothing required
      break;

    case 'survey':
      if (!Number.isInteger(block.id) || block.id <= 0) throw new Error('survey block requires numeric positive "id".');
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
      if (!ensureIframeHost(html)) {
        // Drop unsafe host
        b.embed = '';
        return b;
      }
      html = `<iframe src="${html}" frameborder="0" allowfullscreen></iframe>`;
    }

    const sanitized = sanitizeHtml(html, SANITIZE_HTML_OPTIONS);

    // After sanitize, check iframe src host again
    const match = sanitized.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (match) {
      const src = match[1];
      if (!ensureIframeHost(src)) {
        b.embed = '';
        return b;
      }
    } else {
      // iframe stripped
      b.embed = '';
      return b;
    }

    b.embed = sanitized;
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
      validateBlock(blk);
      let n = normalizeBlock(blk);
      n = sanitizeBlock(n);
      out.push(n);
    } catch (err) {
      errors.push({ index: i, error: err });
      if (!skipInvalid) {
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
};