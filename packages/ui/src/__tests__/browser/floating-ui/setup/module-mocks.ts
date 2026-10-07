import { vi } from 'vitest'

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
