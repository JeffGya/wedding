import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/store/auth';
import { fetchGuestSettings } from '@/api/settings';

/**
 * Composable to handle app initialization including:
 * - Font loading
 * - Image preloading
 * - API calls (auth, guest settings)
 * - Minimum display time for splash screen
 */
export function useAppInitialization() {
  const isInitializing = ref(true);
  const startTime = ref(null);
  const minDisplayTime = 1000; // 1 seconds minimum

  // Get uploads URL from environment
  const uploadsUrl = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5001/uploads';

  /**
   * Preload a single image
   */
  function preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /**
   * Preload a video
   */
  function preloadVideo(src) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.oncanplaythrough = () => resolve();
      video.onerror = () => reject(new Error(`Failed to load video: ${src}`));
      video.src = src;
      video.load();
    });
  }

  /**
   * Preload all critical images and videos
   */
  async function preloadAssets() {
    const assets = [
      // Hero images (both needed for theme switching)
      `${uploadsUrl}/hero.png`,
      `${uploadsUrl}/hero-dark.png`,
      // Other images from Home page
      `${uploadsUrl}/engagement.jpg`,
      `${uploadsUrl}/collage.png`,
      `${uploadsUrl}/us-cute.jpg`,
      // Video
      `${uploadsUrl}/sunset-kiss.mp4`
    ];

    const promises = assets.map(asset => {
      if (asset.endsWith('.mp4')) {
        return preloadVideo(asset).catch(err => {
          // Log but don't fail initialization if video fails
          if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOGS) {
            console.warn('Video preload warning:', err.message);
          }
          return Promise.resolve();
        });
      } else {
        return preloadImage(asset).catch(err => {
          // Log but don't fail initialization if image fails
          if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOGS) {
            console.warn('Image preload warning:', err.message);
          }
          return Promise.resolve();
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Wait for fonts to load
   */
  async function waitForFonts() {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  }

  /**
   * Load initial API data
   */
  async function loadInitialData() {
    const auth = useAuthStore();
    
    // Fetch user (may already be called in App.vue onMounted, but ensure it completes)
    // If user is already set, we can skip. Otherwise, fetch it.
    // Since both might run in parallel, we'll just ensure one completes.
    const userPromise = auth.user ? Promise.resolve() : auth.fetchUser();
    await userPromise;

    // Load guest settings (needed for public routes)
    try {
      await fetchGuestSettings();
    } catch (err) {
      // Log but don't fail initialization if guest settings fail
      if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOGS) {
        console.warn('Guest settings load warning:', err);
      }
    }
  }

  /**
   * Initialize the app
   */
  async function initialize() {
    startTime.value = Date.now();

    try {
      // Run all initialization tasks in parallel
      await Promise.all([
        waitForFonts(),
        preloadAssets(),
        loadInitialData()
      ]);

      // Ensure minimum display time
      const elapsed = Date.now() - startTime.value;
      const remaining = Math.max(0, minDisplayTime - elapsed);
      
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
    } catch (error) {
      // Log error but still proceed after minimum time
      if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOGS) {
        console.error('Initialization error:', error);
      }
      
      // Ensure minimum display time even on error
      const elapsed = Date.now() - startTime.value;
      const remaining = Math.max(0, minDisplayTime - elapsed);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
    } finally {
      isInitializing.value = false;
    }
  }

  // Start initialization on mount
  onMounted(() => {
    initialize();
  });

  return {
    isInitializing
  };
}
