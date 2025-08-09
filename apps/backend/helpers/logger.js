// Enhanced logger helper

const LEVEL = (process.env.LOG_LEVEL || 'warn').toLowerCase();
const levels = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const current = levels[LEVEL] ?? levels.warn;

function out(method, level, args) {
  if (levels[level] < current) return;
  console[method](`[${level.toUpperCase()}]`, ...args);
}

module.exports = {
  debug: (...a) => out('log', 'debug', a),
  info:  (...a) => out('log', 'info', a),
  warn:  (...a) => out('warn', 'warn', a),
  error: (...a) => out('error', 'error', a),
};
