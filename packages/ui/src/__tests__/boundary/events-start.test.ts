import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * A client entry waits for `startEvents` before it hydrates. The case needs a
 * recorder module that fails to load, which wants `vi.resetModules()` and a
 * mock of its own. The `unit` project bars both (see
 * `test-isolation-boundary.test.ts`), so this suite sits in `boundary/`, which
 * runs on forks.
 */

const RECORDER = '../../modules/events/engine/events-recorder'

afterEach(() => {
	vi.doUnmock(RECORDER)

	localStorage.removeItem('events:on')

	document.documentElement.removeAttribute('data-events')
})

describe('startEvents', () => {
	it('resolves when the recorder fails to load, so the page hydrates', async ({ signal }) => {
		localStorage.setItem('events:on', '1')

		vi.resetModules()

		vi.doMock(RECORDER, () => {
			throw new Error('stale chunk')
		})

		const { startEvents } = await import('../../modules/events/engine/events-setting')

		signal.throwIfAborted()

		await expect(startEvents()).resolves.toBeUndefined()
	})
})
