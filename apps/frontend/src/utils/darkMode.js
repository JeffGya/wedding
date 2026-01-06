/**
 * Dark mode utility functions
 * Handles system preference detection and localStorage persistence
 */

const STORAGE_KEY = 'dark-mode-preference';
const MODE_ELEMENT_ID = 'mode';

/**
 * Get system preference for dark mode
 */
export function getSystemPreference() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get saved user preference from localStorage
 * Returns 'dark', 'light', or null (null means use system preference)
 */
export function getSavedPreference() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Save user preference to localStorage
 */
export function savePreference(preference) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    if (preference === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get the initial dark mode state
 * Checks localStorage first, then falls back to system preference
 */
export function getInitialDarkMode() {
  const saved = getSavedPreference();
  if (saved === 'dark') {
    return true;
  }
  if (saved === 'light') {
    return false;
  }
  // No saved preference, use system preference
  return getSystemPreference();
}

/**
 * Initialize dark mode on page load (before Vue mounts)
 * This prevents flash of incorrect theme
 */
export function initializeDarkModeEarly() {
  const initialDark = getInitialDarkMode();
  const element = document.getElementById(MODE_ELEMENT_ID);
  if (element) {
    if (initialDark) {
      element.classList.add('dark-mode');
    } else {
      element.classList.remove('dark-mode');
    }
  }
}

/**
 * Get current dark mode state from DOM
 */
export function getCurrentDarkMode() {
  const element = document.getElementById(MODE_ELEMENT_ID);
  return element ? element.classList.contains('dark-mode') : false;
}

/**
 * Toggle dark mode and save preference
 */
export function toggleDarkMode() {
  const element = document.getElementById(MODE_ELEMENT_ID);
  if (!element) return;
  
  const isCurrentlyDark = element.classList.contains('dark-mode');
  const newValue = !isCurrentlyDark;
  
  // Toggle the class
  if (newValue) {
    element.classList.add('dark-mode');
  } else {
    element.classList.remove('dark-mode');
  }
  
  // Save user preference
  savePreference(newValue ? 'dark' : 'light');
  
  return newValue;
}

/**
 * Set dark mode state
 */
export function setDarkMode(isDark) {
  const element = document.getElementById(MODE_ELEMENT_ID);
  if (!element) return;
  
  if (isDark) {
    element.classList.add('dark-mode');
  } else {
    element.classList.remove('dark-mode');
  }
  
  // Save user preference
  savePreference(isDark ? 'dark' : 'light');
}




