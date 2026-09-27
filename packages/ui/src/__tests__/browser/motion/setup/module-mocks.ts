import { vi } from 'vitest'

/**
 * motion-project module mocks. `motion/react` is not mocked: this project
 * checks the result of a real animation, which the instant mock cannot show.
 * `@floating-ui/react` is mocked for the reason that `browser/setup` gives.
 */
vi.mock('@floating-ui/react', async () => (await import('../../../mocks/floating-ui')).default)
