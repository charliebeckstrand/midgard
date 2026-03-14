# Hard-Won Knowledge

Mistakes, failed approaches, and surprising behavior. Each entry should prevent a future session from repeating it.

## 2026-03-14 — Tailwind CSS v4 requires explicit @source directives

Tailwind CSS v4 in apps does not auto-detect classes from workspace packages. Every workspace package whose source files contain Tailwind `className` strings must be explicitly listed with `@source '../../../packages/<name>/src'` in `globals.css`. This includes `catalyst`, `heimdall`, and any future package. Missing a package silently omits those classes — there is no error, the styles just don't appear.

## 2026-03-14 — Base tsconfig lacks DOM types

The root `tsconfig.base.json` only includes `"lib": ["ES2022"]`. Packages that use browser APIs (IntersectionObserver, DOM types) must add `"lib": ["ES2022", "DOM", "DOM.Iterable"]` in their own tsconfig.

## 2026-03-14 — Heimdall tsup has two build passes (outdated — see Sindri)

~~Heimdall uses two tsup config entries.~~ After the Sindri extraction, Heimdall has a single build pass for server modules only. **Sindri** now uses two tsup config entries: one for the form hook (use-form) with `clean: true`, and one for client components (login-page, register-page, password-input) with `'use client'` banner and `clean: false`. New client-side UI files go in Sindri's second entry.
