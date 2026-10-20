import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Chemins relatifs + routage par « # » : le site fonctionne tel quel sur GitHub Pages ou Cloudflare Pages.
// Version affichée en bas de l'écran (commit construit par GitHub Actions ; « dev » en local).
const BUILD = (process.env.GITHUB_SHA ?? '').slice(0, 7) || 'dev';

export default defineConfig({
  base: './',
  define: {
    __BUILD__: JSON.stringify(BUILD),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'VériJob Canada',
        short_name: 'VériJob',
        description: "Vérifier une offre d'emploi au Canada et éviter les arnaques. Outil gratuit, non gouvernemental.",
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0b5394',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // L'application et les petits fichiers de données sont disponibles hors ligne dès l'installation.
        globPatterns: [
          '**/*.{js,css,html,svg,png,webmanifest}',
          'data/{employers-index,wages,cma-lookup,designated-employers,community-priorities,express-entry,postings,african-recruiters,permits-africa,international-offers,current-offers,proposals-status,employer-contacts}.json',
        ],
        // pdf.js (lecture des CV en PDF, environ 1,7 Mo) n'est pas préchargé : il est téléchargé
        // la première fois qu'on vérifie un CV PDF, puis gardé en cache (règle plus bas).
        // pdf.js et l'index de recherche des 516 métiers : chargés seulement quand on en a besoin (pas à l'installation).
        globIgnores: ['**/assets/pdf-*.js', '**/assets/pdf.worker*', '**/assets/noc-search-*.js'],
        navigateFallback: 'index.html',
        // Les listes d'employeurs par province (plus lourdes) sont gardées en cache après la 1re consultation.
        runtimeCaching: [
          {
            // Employeurs par province, par métier (prospects/<CNP>.json) et fonctions officielles par métier (noc/<CNP>.json).
            urlPattern: ({ url }) => /\/data\/(employers-[A-Z]{2}|prospects|prospects\/\d{5}|noc\/\d{5})\.json$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'verijob-employeurs', expiration: { maxEntries: 60 } },
          },
          {
            urlPattern: ({ url }) => /\/assets\/(pdf(\.worker[^/]*|-[^/]*)|noc-search-[^/]*)\.m?js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'verijob-pdfjs', expiration: { maxEntries: 6 } },
          },
          {
            // Actualités IRCC et rondes Entrée express lues en direct : réseau d'abord, dernière réponse hors ligne.
            urlPattern: ({ url }) => url.origin === 'https://api.io.canada.ca'
              || (url.origin === 'https://www.canada.ca' && url.pathname.startsWith('/content/dam/ircc/documents/json/')),
            handler: 'NetworkFirst',
            options: { cacheName: 'verijob-direct', networkTimeoutSeconds: 15, expiration: { maxEntries: 6 } },
          },
        ],
      },
    }),
  ],
  build: { target: 'es2020' },
});
