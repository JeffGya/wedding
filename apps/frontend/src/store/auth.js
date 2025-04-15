import { defineStore } from 'pinia';
import { me, logout as logoutRequest } from '@/api/auth.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
  },

  actions: {
    async fetchUser() {
      try {
        this.user = await me();
      } catch {
        this.user = null;
      }
    },

    async logout() {
      await logoutRequest();
      this.user = null;
      window.location.reload();
    }
  }
});
