import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The client entry waits for `startEventLog` before it hydrates. Each case
 * needs a recorder module that fails to load, which wants `vi.resetModules()`
 * and a mock of its own. The `unit` project bars both (see
 * `test-isolation-boundary.test.ts`), so this suite sits in `boundary/`, which
 * runs on forks.
 */

const RECORDER = '../../docs/debug/event-log/recorder.ts'

// The `ui` program excludes the docs app, which has a program of its own. The
// path is a variable, so this program does not check the docs modules, and the
// case gives the type of the one export that it reads.
const EVENT_LOG = '../../docs/debug/event-log/index.tsx'

afterEach(() => {
	vi.doUnmock(RECORDER)

	document.documentElement.removeAttribute('data-debug')
})

describe('startEventLog', () => {
	it('resolves when the recorder fails to load, so the page hydrates', async ({ signal }) => {
		document.documentElement.setAttribute('data-debug', '')

		vi.resetModules()

		vi.doMock(RECORDER, () => {
			throw new Error('stale chunk')
		})

		const { startEventLog }: { startEventLog: () => Promise<void> } = await import(EVENT_LOG)

		signal.throwIfAborted()

		await expect(startEventLog()).resolves.toBeUndefined()
	})
})
