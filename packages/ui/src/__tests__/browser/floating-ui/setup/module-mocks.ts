import { beforeAll, vi } from 'vitest'
import { loadTooltipBody } from '../../../../components/tooltip/tooltip-body-loader'

/**
 * floating-ui-project module mocks. `@floating-ui/react` is deliberately left
 * real: this project exercises the live focus engine. `motion/react` and
 * `motion/react-m` are mocked; an in-flight animation must not leave an element
 * mid-transition while focus is asserted. The tooltip body loader loads the
 * real module, with a hold that `tooltip-first-intent.test.tsx` sets to see a
 * tooltip before the load.
 */
vi.mock('motion/react', async () => (await import('../../../mocks/motion-react')).default)
vi.mock('motion/react-m', async () => (await import('../../../mocks/motion-react-m')).default)
vi.mock('../../../../components/tooltip/tooltip-body-loader', async (importOriginal) =>
	(await import('../../../mocks/tooltip-body-loader')).default(importOriginal),
)

// `TooltipContent` loads the module of the panel after it mounts, and a case
// that reads an open panel after a fixed wait can read before the load ends.
// The first load of a worker also transforms the module, and a slow runner
// can take more than two frames for it. The order of the files decides which
// case of a worker loads first. The load before each file gives each case the
// state of a page that already loaded the module, as the other setups do.
// `tooltip-first-intent.test.tsx` holds the load in each case, and thus tests
// the state before the load.
beforeAll(() => loadTooltipBody())
