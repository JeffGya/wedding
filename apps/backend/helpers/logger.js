// Enhanced logger helper

function info(...args) {
  console.log('ℹ️ [INFO]', ...args);
}

function error(...args) {
  console.error('❌ [ERROR]', ...args);
}

module.exports = {
  info,
  error,
};
