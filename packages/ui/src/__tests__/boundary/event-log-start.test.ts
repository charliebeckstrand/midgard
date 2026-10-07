import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The client entry waits for `startDebug` before it hydrates. Each case
 * needs a recorder module that fails to load, which wants `vi.resetModules()`
 * and a mock of its own. The `unit` project bars both (see
 * `test-isolation-boundary.test.ts`), so this suite sits in `boundary/`, which
 * runs on forks.
 */

const RECORDER = '../../docs/debug/recorder.ts'

// The `ui` program excludes the docs app, which has a program of its own. The
// path is a variable, so this program does not check the docs modules, and the
// case gives the type of the one export that it reads.
const DEBUG = '../../docs/debug/index.tsx'

afterEach(() => {
	vi.doUnmock(RECORDER)

	document.documentElement.removeAttribute('data-debug')
})

describe('startDebug', () => {
	it('resolves when the recorder fails to load, so the page hydrates', async ({ signal }) => {
		document.documentElement.setAttribute('data-debug', '')

		vi.resetModules()

		vi.doMock(RECORDER, () => {
			throw new Error('stale chunk')
		})

		const { startDebug }: { startDebug: () => Promise<void> } = await import(DEBUG)

		signal.throwIfAborted()

		await expect(startDebug()).resolves.toBeUndefined()
	})
})
