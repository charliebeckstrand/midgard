import { vi } from 'vitest'

/**
 * Browser-suite module mocks. Deliberately narrower than the jsdom set
 * (setup/module-mocks.ts): `@floating-ui/react` stays REAL here so popover
 * positioning runs against a real layout — one of the things jsdom can't do.
 *
 * `maplibre-gl` stays mocked (WebGL doesn't run reliably headless and the map
 * canvas isn't what these geometry checks target) and `motion/react` stays
 * mocked so components render fully settled — a half-played fade would give the
 * `color-contrast` check a non-deterministic opacity to composite against.
 */
vi.mock('maplibre-gl', async () => (await import('../../mocks/maplibre-gl')).default)
vi.mock('motion/react', async () => (await import('../../mocks/motion-react')).default)
