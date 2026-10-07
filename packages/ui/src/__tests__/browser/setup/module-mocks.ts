import { beforeAll, vi } from 'vitest'
import { loadTooltipBody } from '../../../components/tooltip/tooltip-body-loader'

/**
 * Browser-suite module mocks. `@floating-ui/react` is mocked: overlay panels
 * render inline and settled (the real autoUpdate/ref-callback cycle loops under
 * a headless, act-less render, causing "Maximum update depth exceeded"), and the
 * contrast check needs the panel's colors, not its position. `motion/react` and
 * `motion/react-m` are mocked; a half-played fade must not present a transient
 * opacity to `color-contrast`.
 */
vi.mock('@floating-ui/react', async () => (await import('../../mocks/floating-ui')).default)
vi.mock('motion/react', async () => (await import('../../mocks/motion-react')).default)
vi.mock('motion/react-m', async () => (await import('../../mocks/motion-react-m')).default)

// A tooltip that mounts before its state module loads hands over to the state
// when the load ends, and the handover is a nested commit. `TooltipContent`
// starts the load in idle time, so without this load the handover lands at a
// moment that the order of the files decides, and a case that counts commits
// can see it. The load before each file gives each case the state of a page
// that already loaded the module, as the jsdom setup does.
beforeAll(() => loadTooltipBody())
