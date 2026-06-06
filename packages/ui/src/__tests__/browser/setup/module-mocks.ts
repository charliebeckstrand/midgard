import { vi } from 'vitest'

/**
 * Browser-suite module mocks. The geometry gate checks colour and hit-target
 * size, neither of which needs real positioning, so the same heavy lifecycles
 * the jsdom suite mocks are mocked here too — they only add nondeterminism.
 *
 * `@floating-ui/react` is mocked so overlay panels render inline and settled:
 * its real autoUpdate/ref-callback cycle loops under a headless, act-less render
 * (popover/calendar hit "Maximum update depth exceeded"), and a contrast check
 * wants the panel's colours, not where it lands. `maplibre-gl` stays mocked
 * (WebGL is unreliable headless) and `motion/react` stays mocked so a half-played
 * fade never gives `color-contrast` a transient opacity to composite against.
 */
vi.mock('@floating-ui/react', async () => (await import('../../mocks/floating-ui')).default)
vi.mock('maplibre-gl', async () => (await import('../../mocks/maplibre-gl')).default)
vi.mock('motion/react', async () => (await import('../../mocks/motion-react')).default)
