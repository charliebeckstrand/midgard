# Error Solutions

Indexed by error message or symptom for quick lookup.

## ERR_WORKER_OUT_OF_MEMORY — Worker terminated due to reaching memory limit

- **Cause:** The ui package's `tsup --watch` runs DTS generation (TypeScript declaration files) in a worker thread. With 30+ entry points, the worker needs to type-check the entire project on every rebuild, exhausting the default heap limit.
- **Fix:** Use `--no-dts` for dev mode (`tsup --watch --no-dts`). DTS is only needed for production builds. The `ui` package.json `dev` script includes this flag.
- **Date:** 2026-03-15

## Failed to find font override values for font `Google Sans` — Skipping generating a fallback font

- **Cause:** Next.js tries to generate an optimized fallback font (for CLS reduction) but doesn't have pre-calculated metrics for "Google Sans" in its internal font database. The font still loads and works correctly.
- **Fix:** Add `adjustFontFallback: false` to the `Google_Sans()` config in each app's `layout.tsx`. This tells Next.js to skip fallback font generation.
- **Date:** 2026-03-17
