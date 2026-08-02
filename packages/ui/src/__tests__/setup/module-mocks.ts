import { vi } from 'vitest'

/**
 * Module mocks applied to every test file.
 *
 * These must be global. The unit project runs `isolate: false`, so one module
 * registry serves every file a worker runs: a per-file `vi.mock` of the same
 * module reaches the files scheduled after it, and `sequence.shuffle` decides
 * which those are. No file in that project declares one, and none can —
 * `test-isolation-boundary.test.ts` enforces it. A suite that needs a different
 * double drives the global mock instead, with a spy or through a stub the mock
 * already reads (see `components/shiny-text` and
 * `components/use-hold-button-gesture-reduced-motion`).
 *
 * The `integration` project keeps `forks`, so the suites that genuinely need a
 * per-file `vi.mock` live there.
 */

vi.mock('@floating-ui/react', async () => (await import('../mocks/floating-ui')).default)

vi.mock('motion', async () => (await import('../mocks/motion')).default)

vi.mock('motion/react', async () => (await import('../mocks/motion-react')).default)

vi.mock('shiki', async () => (await import('../mocks/shiki')).default)
