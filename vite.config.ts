import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { defineConfig, loadEnv } from 'vite';

// Copy precached hero images and the service worker into the dist folder
// so the production build serves them alongside the JS bundle.
function copyHeroAssets() {
  return {
    name: 'copy-hero-assets',
    apply: 'build' as const,
    closeBundle() {
      const publicHero = resolve(__dirname, 'public', 'hero');
      const distHero = resolve(__dirname, 'dist', 'hero');
      if (existsSync(publicHero)) {
        if (!existsSync(distHero)) mkdirSync(distHero, { recursive: true });
        for (const file of readdirSync(publicHero)) {
          copyFileSync(
            resolve(publicHero, file),
            resolve(distHero, file)
          );
        }
      }
      const swSrc = resolve(__dirname, 'public', 'sw.js');
      const swDst = resolve(__dirname, 'dist', 'sw.js');
      if (existsSync(swSrc)) copyFileSync(swSrc, swDst);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';

  return {
    plugins: [tailwindcss(), copyHeroAssets()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          // Manual code splitting for better caching and lazy loading.
          // Firebase is ESM-only and must remain in the main bundle.
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('@tanstack')) return 'vendor-query';
              if (id.includes('react') || id.includes('wouter')) return 'vendor-react';
            }
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});