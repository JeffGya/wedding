// apps/frontend/src/loggingGuard.js
const enable =
  String(import.meta.env.VITE_ENABLE_LOGS || '').trim().toLowerCase() === 'true';

// Store original console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalDebug = console.debug;
const originalInfo = console.info;
const originalTable = console.table;
const originalGroup = console.group;
const originalGroupCollapsed = console.groupCollapsed;
const originalGroupEnd = console.groupEnd;

// Suppress Quill toolbar warnings for custom toolbar buttons that don't use formats
// These buttons use click handlers instead of Quill formats
const quillWarningSuppressor = function(...args) {
  const message = args[0]?.toString() || '';
  // Filter out Quill toolbar warnings about nonexistent custom formats
  // These warnings are harmless - custom buttons use click handlers, not Quill formats
  if (message.includes('quill:toolbar ignoring attaching to nonexistent format')) {
    return; // Suppress these specific warnings
  }
  // Call original warn for all other messages
  originalWarn.apply(console, args);
};

// Apply Quill warning suppression regardless of VITE_ENABLE_LOGS
console.warn = quillWarningSuppressor;

if (!enable) {
  const noop = () => {};
  // Suppress log, debug, info, table, group methods
  ['log', 'debug', 'info', 'table', 'group', 'groupCollapsed', 'groupEnd']
    .forEach((m) => (console[m] = noop));
  
  // Make console.warn conditional (but keep Quill suppression)
  console.warn = function(...args) {
    // First check for Quill warnings
    const message = args[0]?.toString() || '';
    if (message.includes('quill:toolbar ignoring attaching to nonexistent format')) {
      return; // Suppress Quill warnings
    }
    // Suppress all other warnings when logs are disabled
    return;
  };
  
  // Keep console.error always active
}

/**
 * Helper function for conditional logging
 * Use this in components/files where you need conditional logging
 * @param {...any} args - Arguments to log
 */
export function conditionalLog(...args) {
  if (enable) {
    originalLog.apply(console, args);
  }
}

/**
 * Helper function for conditional warning
 * @param {...any} args - Arguments to warn
 */
export function conditionalWarn(...args) {
  if (enable) {
    // Check for Quill warnings first
    const message = args[0]?.toString() || '';
    if (message.includes('quill:toolbar ignoring attaching to nonexistent format')) {
      return; // Suppress Quill warnings
    }
    originalWarn.apply(console, args);
  }
}
