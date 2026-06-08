import { vi } from 'vitest'

/**
 * Browser-real-suite module mocks. `@floating-ui/react` is deliberately left
 * real: this suite exercises the live focus engine. `maplibre-gl` is mocked
 * (WebGL is unreliable headless). `motion/react` is mocked; an in-flight
 * animation must not leave an element mid-transition while focus is asserted.
 */
vi.mock('maplibre-gl', async () => (await import('../../mocks/maplibre-gl')).default)
vi.mock('motion/react', async () => (await import('../../mocks/motion-react')).default)
