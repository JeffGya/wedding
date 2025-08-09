// apps/frontend/src/loggingGuard.js
const enable =
  String(import.meta.env.VITE_ENABLE_LOGS || '').trim().toLowerCase() === 'true';

if (!enable) {
  const noop = () => {};
  ['log', 'debug', 'info', 'table', 'group', 'groupCollapsed', 'groupEnd']
    .forEach((m) => (console[m] = noop));
  // Keep warn/error
}
