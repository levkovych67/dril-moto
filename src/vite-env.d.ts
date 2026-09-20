// src/vite-env.d.ts — тип версії, яку vite.config.ts підставляє через define.
interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string
}
