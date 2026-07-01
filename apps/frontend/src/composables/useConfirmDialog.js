/**
 * useConfirmDialog Composable
 *
 * Thin wrapper around PrimeVue's ConfirmationService (`useConfirm().require()`)
 * that enforces the admin dashboard redesign's confirm-dialog conventions:
 *
 *  - Header: bold sans-serif ~17px (see the global `.p-confirmdialog` override
 *    in apps/frontend/src/style.css — extend that block, don't duplicate it).
 *  - Footer: two right-aligned buttons — an outlined/secondary Cancel button,
 *    and a destructive accept button (background #B3453B, white text) labeled
 *    with the actual action (e.g. "Delete guest") — never a bare "OK"/"Confirm".
 *  - Escape key and scrim-click close the dialog — this is PrimeVue's default
 *    behavior (`closeOnEscape` / `dismissableMask` are not overridden here).
 *
 * This composable does NOT replace `useConfirm()` — it's a convenience layer
 * on top of it. `ConfirmationService` must already be installed globally
 * (see apps/frontend/src/main.js: `app.use(ConfirmationService)`), and
 * `<ConfirmDialog />` must be mounted once in the app (see App.vue).
 *
 * NOTE (Phase 1): this composable is not wired into any existing screen yet.
 * Existing `confirm.require()` call sites (TemplateManager.vue, PageList.vue)
 * and any `window.confirm()` usage are migrated in a later phase.
 *
 * Usage:
 *   import { useConfirmDialog } from '@/composables/useConfirmDialog';
 *
 *   const { confirmDialog } = useConfirmDialog();
 *
 *   function onDeleteGuest(id) {
 *     confirmDialog({
 *       header: 'Delete guest',
 *       message: 'Are you sure you want to delete this guest? This cannot be undone.',
 *       acceptLabel: 'Delete guest',
 *       onAccept: async () => {
 *         await deleteGuest(id);
 *       }
 *     });
 *   }
 */

import { useConfirm } from 'primevue/useconfirm';

const DESTRUCTIVE_BG = '#B3453B';

/**
 * @returns {{ confirmDialog: Function }}
 */
export function useConfirmDialog() {
  const confirm = useConfirm();

  /**
   * @param {Object} options
   * @param {string} options.header - Dialog header/title.
   * @param {string} options.message - Dialog body message.
   * @param {string} options.acceptLabel - Label for the destructive accept
   *   button — must name the actual action (e.g. "Delete guest"), never a
   *   bare "OK"/"Confirm".
   * @param {string} [options.cancelLabel='Cancel'] - Label for the reject button.
   * @param {Function} options.onAccept - Called when the user confirms.
   * @param {Function} [options.onCancel] - Called when the user cancels/dismisses.
   * @param {string} [options.icon='pi pi-exclamation-triangle'] - Header icon.
   */
  function confirmDialog({
    header,
    message,
    acceptLabel,
    cancelLabel = 'Cancel',
    onAccept,
    onCancel,
    icon = 'pi pi-exclamation-triangle'
  }) {
    if (!acceptLabel) {
      throw new Error(
        '[useConfirmDialog] acceptLabel is required and must name the actual action (e.g. "Delete guest") — never a bare "OK"/"Confirm".'
      );
    }

    confirm.require({
      header,
      message,
      icon,
      // PrimeVue default behavior — do not disable these.
      closeOnEscape: true,
      dismissableMask: true,
      acceptLabel,
      rejectLabel: cancelLabel,
      acceptProps: {
        label: acceptLabel,
        style: {
          backgroundColor: DESTRUCTIVE_BG,
          borderColor: DESTRUCTIVE_BG,
          color: '#FFFFFF'
        }
      },
      rejectProps: {
        label: cancelLabel,
        outlined: true,
        severity: 'secondary'
      },
      accept: () => {
        if (typeof onAccept === 'function') onAccept();
      },
      reject: () => {
        if (typeof onCancel === 'function') onCancel();
      }
    });
  }

  return { confirmDialog };
}
