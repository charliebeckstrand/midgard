import { vi } from 'vitest'

/**
 * Browser-real-suite module mocks. Identical to the main browser suite
 * (browser/setup/module-mocks.ts) except `@floating-ui/react` is deliberately
 * left REAL: this suite exists to exercise the live focus engine, so mocking it
 * away would defeat the point. `maplibre-gl` stays mocked (WebGL is unreliable
 * headless) and `motion/react` stays mocked so an in-flight animation never
 * leaves the element mid-transition while focus is asserted against it.
 */
vi.mock('maplibre-gl', async () => (await import('../../mocks/maplibre-gl')).default)
vi.mock('motion/react', async () => (await import('../../mocks/motion-react')).default)
