// Production-ready logger helper

const LEVEL = (process.env.LOG_LEVEL || 'warn').toLowerCase();
const levels = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const current = levels[LEVEL] ?? levels.warn;

/**
 * Detect environment from SITE_URL
 * @returns {string} Environment name ('local', 'staging', or 'production')
 */
function detectEnvironment() {
  const siteUrl = process.env.SITE_URL || '';
  if (!siteUrl) return 'unknown';
  
  // Check if localhost
  if (siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1') || siteUrl.includes('0.0.0.0')) {
    return 'local';
  }
  
  // Check if staging (common patterns)
  if (siteUrl.includes('staging') || siteUrl.includes('stage') || siteUrl.includes('dev') || siteUrl.includes('test')) {
    return 'staging';
  }
  
  // Default to production
  return 'production';
}

function out(method, level, args) {
  if (levels[level] < current) return;
  
  const env = detectEnvironment();
  const isProduction = env === 'production';
  
  // Simplified format for production, verbose for local/staging
  if (isProduction) {
    // Production: minimal prefix, just level
    console[method](`[${level.toUpperCase()}]`, ...args);
  } else {
    // Local/Staging: include environment for debugging
    const envPrefix = env !== 'unknown' ? `[${env}]` : '';
    console[method](`[${level.toUpperCase()}]${envPrefix}`, ...args);
  }
}

module.exports = {
  debug: (...a) => out('log', 'debug', a),
  info:  (...a) => out('log', 'info', a),
  warn:  (...a) => out('warn', 'warn', a),
  error: (...a) => out('error', 'error', a),
  detectEnvironment,
};
