import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '@/views/LoginView.vue';
import AdminLayout from '@/layouts/AdminLayout.vue';
import GenericLayout from '@/layouts/GenericLayout.vue';
import { useAuthStore } from '@/store/auth';
import EmailSettings from '@/views/admin/settings/EmailSettings.vue';
import GuestSettings from '@/views/admin/settings/GuestSettings.vue';
import { useLangStore } from '@/store/lang';
import i18n from '@/i18n';

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
      component: () => import('@/views/public/Home.vue'),
      beforeEnter: (to, from, next) => {
        const lang = to.params.lang || 'en';
        const langStore = useLangStore();
        langStore.setLanguage(lang);
        next();
      },
    },
    {
      path: 'rsvp',
      name: 'public-rsvp-lookup',
      component: () => import('@/views/public/RSVPLookup.vue'),
      // beforeEnter: (to, from, next) => {
      //   i18n.global.locale.value = to.params.lang
      //   next()
      // }
    },
    {
      path: 'rsvp/:code',
      name: 'public-rsvp',
      component: () => import('@/views/public/RSVP.vue'),
      // beforeEnter: (to, from, next) => {
      //   i18n.global.locale.value = to.params.lang
      //   next()
      // }
    },
    {
      path: 'rsvp/:code/success',
      name: 'public-rsvp-success',
      component: () => import('@/views/public/RSVPSuccess.vue'),
      beforeEnter: (to, from, next) => {
        // ensure locale is set without breaking the ref
        i18n.global.locale.value = to.params.lang;
        next();
      }
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
          },
          {
            path: 'guests',
            name: 'admin-settings-guests',
            component: GuestSettings,
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
  // synchronize i18n locale from route parameter
  const lang = to.params.lang || 'en';
  // Determine locales, whether availableLocales is a function or an array
  const localeList =
    typeof i18n.global.availableLocales === 'function'
      ? i18n.global.availableLocales()
      : i18n.global.availableLocales;
  // if (Array.isArray(localeList) && localeList.includes(lang)) {
  //   i18n.global.locale.value = lang;
  // }
  i18n.global.locale.value = lang;

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