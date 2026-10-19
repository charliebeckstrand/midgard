import { vi } from 'vitest'

/**
 * Reverts the spies, the stubs, and the fake clock of the test that just ran.
 * Each setup calls this after each test, so a test file restores nothing
 * itself.
 *
 * The order is the reason for one shared function. A spy on a timer global,
 * such as `vi.spyOn(window, 'setInterval')` under a fake clock, wraps the fake
 * function. When `useRealTimers` runs first, the restore of the spy puts that
 * dead fake back on the window. On a shared worker, each later file then
 * schedules on a timer that never fires. The spies and stubs therefore come
 * off before the clock does.
 *
 * The config also restores the spies and stubs before each test (`cleanup` in
 * `vitest.base.ts`). That leaves the gap at the end of a file: the last test
 * keeps its spies while the next file runs its `beforeAll` hooks. A clock that
 * a test installs also stays when the runner aborts the test at `testTimeout`.
 * `useRealTimers` is a no-op where no fake clock is installed.
 */
export function restoreTestState(): void {
	vi.restoreAllMocks()

	vi.unstubAllGlobals()

	vi.unstubAllEnvs()

	vi.useRealTimers()
}
