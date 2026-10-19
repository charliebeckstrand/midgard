import { vi } from 'vitest'
// The mock modules load before the other imports. Each one waits on its real
// module (`vi.importActual`). A factory that loads a mock later waits behind
// the module requests of the files, sometimes for seconds. Its request then
// stays open while thousands of other requests pass, and Playwright disposes
// it ("route.fulfill: The object has been collected"). Loaded here, the
// factory gets the mock from the module cache.
import '../../../mocks/floating-ui'
import { loadMotionFeatures } from '../../../../primitives/reduced-motion/reduced-motion-features'
import { giveReducedMotionHint } from '../../setup/reduced-motion-hint'

/**
 * motion-project module mocks. `motion/react` is not mocked: this project
 * checks the result of a real animation, which the instant mock cannot show.
 * `@floating-ui/react` is mocked for the reason that `browser/setup` gives.
 */
vi.mock('@floating-ui/react', async () => (await import('../../../mocks/floating-ui')).default)

// A `ReducedMotion` root loads the Motion features after it mounts. In an app,
// `UIProvider` loads them at idle after hydration, so a surface that opens
// later finds them ready. The suites start from that state, and each root gives
// the features in its first render. `lazy-features.test.tsx` checks the state
// before the features arrive.
await Promise.all([loadMotionFeatures('animation'), loadMotionFeatures('layout')])

// Motion is real here, so its one hint for reduced motion lands before the
// files (see `browser/setup/reduced-motion-hint.ts`).
giveReducedMotionHint()
