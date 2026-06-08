import { vi } from 'vitest'

/**
 * Browser-suite module mocks. `@floating-ui/react` is mocked: overlay panels
 * render inline and settled (the real autoUpdate/ref-callback cycle loops under
 * a headless, act-less render, causing "Maximum update depth exceeded"), and the
 * contrast check needs the panel's colours, not its position. `maplibre-gl` is
 * mocked (WebGL is unreliable headless). `motion/react` is mocked; a half-played
 * fade must not present a transient opacity to `color-contrast`.
 */
vi.mock('@floating-ui/react', async () => (await import('../../mocks/floating-ui')).default)
vi.mock('maplibre-gl', async () => (await import('../../mocks/maplibre-gl')).default)
vi.mock('motion/react', async () => (await import('../../mocks/motion-react')).default)
