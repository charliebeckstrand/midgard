import { vi } from 'vitest'

/**
 * floating-ui-project module mocks. `@floating-ui/react` is deliberately left
 * real: this project exercises the live focus engine. `motion/react` is mocked;
 * an in-flight animation must not leave an element mid-transition while focus
 * is asserted.
 */
vi.mock('motion/react', async () => (await import('../../../mocks/motion-react')).default)
