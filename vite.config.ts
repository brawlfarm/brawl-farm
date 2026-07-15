// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Fallbacks garantem que o Realtime funcione mesmo se as variáveis VITE_*
// não estiverem configuradas no host (ex.: novo projeto Vercel sem env vars).
// A publishable key é pública por design — seguro embutir no bundle.
const SUPABASE_URL_FALLBACK = "https://tgnqhshmfddmoemyktta.supabase.co";
const SUPABASE_KEY_FALLBACK = "sb_publishable__Bz6a63--6woVed5HRibjw_DDZPxfrM";
const SUPABASE_PROJECT_ID_FALLBACK = "tgnqhshmfddmoemyktta";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK,
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_KEY_FALLBACK,
      ),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
        process.env.VITE_SUPABASE_PROJECT_ID || SUPABASE_PROJECT_ID_FALLBACK,
      ),
    },
  },
});

