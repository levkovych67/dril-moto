import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// Версія бандла для «Про гру» і bridge.ready(): з package.json, тож однакова і для
// `npm run build`, і для `npx vite build` (npm_package_version там не заданий).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  // base './' — бандл живе під /moto/ на сайті, усі шляхи відносні
  base: './',
  // 'mpa': відсутній файл (./tracks/dril.mrg у форку) віддає 404, а не index.html
  // з кодом 200 — інакше fetch пака «успішний», а LevelLoader парсить HTML
  appType: 'mpa',
  server: { port: 3100 },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
})
