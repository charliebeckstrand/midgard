import { vi } from 'vitest'

/**
 * `motion` mock applied globally via `setup/module-mocks.ts`.
 *
 * Wraps only the imperative `animate` in a spy that calls through to the real
 * implementation; everything else passes through untouched. Call-through keeps
 * Odometer's RAF tween genuine; ShinyText stubs the return via
 * `vi.mocked(animate)` to observe the sweep without running it.
 *
 * Global, not per-file: under the vmThreads pool a per-file `vi.mock('motion')`
 * resolves inconsistently when `sequence.shuffle` reorders worker loading,
 * intermittently leaving `animate` un-wrapped.
 */
const actual = await vi.importActual<typeof import('motion')>('motion')

// Annotated, not inferred, so the default-export type names the `motion` module
// instead of inlining its private internals (TS4082/TS4094).
const mockedMotion: typeof import('motion') = {
	...actual,
	animate: vi.fn(actual.animate) as unknown as typeof actual.animate,
}

export default mockedMotion
