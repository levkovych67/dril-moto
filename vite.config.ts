import { defineConfig } from 'vite'

// base './' — бандл живе під /moto/ на сайті, усі шляхи відносні
export default defineConfig({
  base: './',
  server: { port: 3100 },
})
