import { vi } from 'vitest'
// The mock modules load before the other imports. Each one waits on its real
// module (`vi.importActual`). A factory that loads a mock later waits behind
// the module requests of the files, sometimes for seconds. Its request then
// stays open while thousands of other requests pass, and Playwright disposes
// it ("route.fulfill: The object has been collected"). Loaded here, the
// factory gets the mock from the module cache.
import '../../../mocks/motion-react'
import '../../../mocks/motion-react-m'

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
