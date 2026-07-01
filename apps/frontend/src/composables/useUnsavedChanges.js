/**
 * useUnsavedChanges Composable
 *
 * Reactive "unsaved changes" guard, matching the conventions used by
 * useLoading.js / useErrorHandler.js (options object in, reactive refs +
 * functions out).
 *
 * Exposes `isDirty` plus `markDirty()` / `markClean()` — the simplest API
 * for a consuming component to drive from its own form-diff logic:
 *
 *   const { isDirty, markDirty, markClean } = useUnsavedChanges();
 *   watch(form, () => markDirty(), { deep: true });
 *   async function onSave() { await save(); markClean(); }
 *
 * Behavior wired up automatically:
 *  - `beforeunload` window listener — only active while `isDirty` is true —
 *    warns on tab close/refresh.
 *  - Vue Router `onBeforeRouteLeave` guard (Vue Router 4 Composition API,
 *    see apps/frontend/src/router/index.js — `createRouter` from 'vue-router')
 *    intercepts in-app navigation while dirty. Instead of navigating
 *    immediately, it exposes `pendingNavigation` (the blocked route) and
 *    `resolveNavigation(action)` so the consuming component can show
 *    LeaveConfirmModal.vue (or its own UI) and decide what happens next:
 *      - resolveNavigation('stay')    -> cancels navigation
 *      - resolveNavigation('discard') -> allows navigation, discarding changes
 *      - resolveNavigation('save')    -> caller should save first, then call
 *                                         resolveNavigation('discard') to proceed
 *
 * NOTE (Phase 1): this composable is not wired into any existing screen yet.
 *
 * Usage:
 *   const {
 *     isDirty, markDirty, markClean,
 *     pendingNavigation, resolveNavigation
 *   } = useUnsavedChanges();
 */

import { ref, onUnmounted } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

export function useUnsavedChanges() {
  const isDirty = ref(false);
  const pendingNavigation = ref(null); // { to, from, next } while a navigation is blocked

  function markDirty() {
    isDirty.value = true;
  }

  function markClean() {
    isDirty.value = false;
  }

  function handleBeforeUnload(event) {
    if (!isDirty.value) return;
    event.preventDefault();
    // Chrome requires returnValue to be set for the native confirm to show.
    event.returnValue = '';
  }

  window.addEventListener('beforeunload', handleBeforeUnload);
  onUnmounted(() => window.removeEventListener('beforeunload', handleBeforeUnload));

  onBeforeRouteLeave((to, from, next) => {
    if (!isDirty.value) {
      next();
      return;
    }
    // Hold the navigation open; the consuming component shows a
    // confirmation UI (e.g. LeaveConfirmModal.vue) and calls
    // resolveNavigation() with the user's choice.
    pendingNavigation.value = { to, from, next };
  });

  /**
   * @param {'stay'|'discard'|'save'} action
   */
  function resolveNavigation(action) {
    const nav = pendingNavigation.value;
    if (!nav) return;

    if (action === 'stay') {
      pendingNavigation.value = null;
      nav.next(false);
      return;
    }

    if (action === 'discard' || action === 'save') {
      pendingNavigation.value = null;
      markClean();
      nav.next();
    }
  }

  return {
    isDirty,
    markDirty,
    markClean,
    pendingNavigation,
    resolveNavigation
  };
}
