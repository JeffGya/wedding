import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '@/views/LoginView.vue';
import AdminLayout from '@/layouts/AdminLayout.vue';
import GenericLayout from '@/layouts/GenericLayout.vue';
import { useAuthStore } from '@/store/auth';
import EmailSettings from '@/views/admin/settings/EmailSettings.vue';
import { useLangStore } from '@/store/lang';
import PublicPageWrapper from '@/components/PublicPageWrapper.vue';

const routes = [
  // Default route redirects to the English homepage
  {
    path: '/',
    redirect: '/en/home' // Redirecting to /en/home by default
  },

// Language-specific route with GenericLayout wrapper
{
  path: '/:lang(en|lt)',  // Handle /en, /lt as language prefix (mandatory now)
  component: GenericLayout, // Use GenericLayout for all public routes
  children: [
    {
      path: 'home',
      name: 'home',
      component: PublicPageWrapper,
      beforeEnter: (to, from, next) => {
        const lang = to.params.lang || 'en';
        const langStore = useLangStore();
        langStore.setLanguage(lang);
        next();
      },
    },

      /* Example of other routes
      {
        path: 'event-details',
        name: 'event-details',
        component: () => import('@/views/public/en/EventDetails.vue'),
      },
      {
        path: 'rsvp',
        name: 'rsvp',
        component: () => import('@/views/public/en/Rsvp.vue'),
      }*/
    ]
  },

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
        path: 'templates',
        name: 'admin-templates',
        component: () => import('@/views/admin/templates/TemplateManager.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'templates/new',
        name: 'admin-template-create',
        component: () => import('@/views/admin/templates/TemplateForm.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'templates/:id/edit',
        name: 'admin-template-edit',
        component: () => import('@/views/admin/templates/TemplateForm.vue'),
        meta: { requiresAuth: true }
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