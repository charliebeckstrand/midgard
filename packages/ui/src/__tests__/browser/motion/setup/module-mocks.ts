import { vi } from 'vitest'
import { loadMotionFeatures } from '../../../../primitives/reduced-motion/reduced-motion-features'

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
