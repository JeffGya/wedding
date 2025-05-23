import { defineStore } from 'pinia';

/**
 * Loader store to manage global loading state.
 * Uses a counter so that overlapping load calls don't prematurely hide the loader.
 */
export const useLoaderStore = defineStore('loader', {
  state: () => ({
    // Number of active loading operations
    count: 0,
  }),
  getters: {
    // True whenever at least one loading operation is in progress
    isLoading: (state) => state.count > 0,
  },
  actions: {
    // Increment the loader counter
    start() {
      this.count++;
    },
    // Decrement the counter, never below zero
    finish() {
      this.count = Math.max(0, this.count - 1);
    },
  },
});
