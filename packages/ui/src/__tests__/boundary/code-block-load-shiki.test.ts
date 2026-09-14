import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * `loadShiki` memoises one dynamic import, so each case needs a module whose
 * memo cell starts empty, and the rejection case needs `import('shiki')` to
 * fail and then to succeed inside one test. Both want `vi.resetModules()` and a
 * mock of its own, which the `unit` project bars: one registry serves every
 * file a worker runs (see `test-isolation-boundary.test.ts`). This suite sits
 * in `boundary/`, which the `integration` project runs on forks, for the reason
 * `map-points-render.test.tsx` states.
 *
 * The `CodeBlock` render cases stay in `components/code-block.test.tsx`. They
 * read the global double and need no registry of their own.
 */

/** Registers the shared double that `setup/module-mocks.ts` installs. */
function mockShiki() {
	vi.doMock('shiki', async () => (await import('../mocks/shiki')).default)
}

/**
 * Makes the next `import('shiki')` reject — the failure that `loadShiki`'s memo
 * must not keep (an offline chunk fetch, a post-deploy 404).
 */
function failShikiImport(error: Error) {
	vi.doMock('shiki', () => {
		throw error
	})
}

/**
 * Returns `loadShiki` from a module whose memo cell is empty. A `vi.doMock`
 * applies to the next import, so register the double before you call this.
 */
async function coldLoadShiki() {
	vi.resetModules()

	return (await import('../../components/code/code-block')).loadShiki
}

describe('loadShiki', () => {
	// A failed run can stop between the two registrations below. Put the shared
	// double back, so the next case reads the registry the first case reads.
	afterEach(mockShiki)

	it('memoises a resolved import so the heavy module is fetched once', async () => {
		const loadShiki = await coldLoadShiki()

		const first = loadShiki()

		await expect(first).resolves.toBeDefined()

		expect(loadShiki()).toBe(first)
	})

	it('drops a rejected import from the memo so a later call retries', async () => {
		failShikiImport(new Error('chunk fetch failed'))

		const loadShiki = await coldLoadShiki()

		const rejected = loadShiki()

		await expect(rejected).rejects.toThrow()

		mockShiki()

		const retry = loadShiki()

		expect(retry).not.toBe(rejected)

		await expect(retry).resolves.toBeDefined()
	})
})
