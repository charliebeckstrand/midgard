- Tailwind CSS v4 in apps/mimir: every workspace package whose source files contain Tailwind `className` strings must be explicitly listed with `@source '../../../packages/<name>/src'` in `globals.css`. This includes `catalyst`, `heimdall`, and any future package. Auto-detection only covers the app's own files. Missing a package silently omits those classes.

## 2026-03-14 — Base tsconfig lacks DOM types
The root `tsconfig.base.json` only includes `"lib": ["ES2022"]`. Packages that use browser APIs (IntersectionObserver, DOM types) must add `"lib": ["ES2022", "DOM", "DOM.Iterable"]` in their own tsconfig. Reactbits needed this for DecryptedText's IntersectionObserver usage.

## 2026-03-14 — Heimdall tsup has two build passes
Heimdall uses two tsup config entries: one for server modules (session, config, proxy) with `clean: true`, and one for client modules (page components) with `'use client'` banner and `clean: false`. New client-side files must be added to the second entry. New server-side files go in the first.
