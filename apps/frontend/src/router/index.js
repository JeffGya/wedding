import { createRouter, createWebHistory } from 'vue-router';
import PublicHome from '@/views/PublicHome.vue';
import LoginView from '@/views/LoginView.vue';
import AdminLayout from '@/layouts/AdminLayout.vue';
import { useAuthStore } from '@/store/auth';
import EmailSettings from '@/views/admin/settings/EmailSettings.vue';

const routes = [
  { path: '/', name: 'home', component: PublicHome },
  { path: '/login', name: 'login', component: LoginView },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: 'overview', name: 'admin-overview', component: () => import('@/views/admin/Overview.vue') },
      { path: 'pages', name: 'admin-pages', component: () => import('@/views/admin/Pages.vue') },
      {
        path: 'settings',
        component: () => import('@/views/admin/Settings.vue'),
        meta: { requiresAuth: true },
        children: [
          {
            path: 'email',
            name: 'admin-settings-email',
            component: EmailSettings,
            meta: { requiresAuth: true }
          }
        ]
      },
      {
        path: 'guests',
        children: [
          { path: 'overview', name: 'admin-guests-overview', component: () => import('@/views/admin/guests/Overview.vue') },
          { path: 'rsvps', name: 'admin-guests-rsvps', component: () => import('@/views/admin/guests/RSVPs.vue') },
          {
            path: 'messages',
            name: 'admin-guests-messages',
            component: () => import('@/views/admin/guests/Messages.vue'),
          },
          { path: 'messages/new', name: 'admin-guests-messages-new', component: () => import('@/views/admin/guests/MessageCreate.vue') },
          { path: 'messages/:id(\\d+)', name: 'admin-guests-messages-detail', component: () => import('@/views/admin/guests/MessageDetail.vue') },
          { path: 'messages/:id(\\d+)/edit', name: 'admin-guests-messages-edit', component: () => import('@/views/admin/guests/MessageCreate.vue') },
        ]
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();

  if (auth.user === null) {
    await auth.fetchUser();
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next({ name: 'login' });
  } else {
    next();
  }
});

export default router;
