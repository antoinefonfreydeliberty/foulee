import type { NextConfig } from 'next'

// Projet autonome, déployé séparément sur Cloudflare (racine de build = foulee-paris/).
// L'adaptateur Cloudflare sera ajouté à l'étape de déploiement (méthode recommandée
// vérifiée à ce moment-là, cf. Foulée.md / instructions). En local : next dev/build.
const nextConfig: NextConfig = {
  // Épingle la racine Turbopack à foulee-paris/. Sinon Turbopack remonte au lockfile
  // racine du monorepo coach_semi et tente de compiler des fichiers de l'app Foulée
  // (ex. proxy.ts) qui n'appartiennent pas à Semi Ca$h.
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
