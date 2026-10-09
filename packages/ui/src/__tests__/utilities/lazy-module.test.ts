// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createLazyModule } from '../../utilities/lazy-module'

describe('createLazyModule', () => {
	it('starts one import for each load, and notifies the readers when it resolves', async () => {
		const importer = vi.fn(() => Promise.resolve('module'))

		const lazy = createLazyModule(importer)

		const listener = vi.fn()

		lazy.subscribe(listener)

		expect(lazy.read()).toBeNull()

		const first = lazy.load()

		expect(lazy.load()).toBe(first)

		await expect(first).resolves.toBe('module')

		expect(importer).toHaveBeenCalledTimes(1)

		expect(listener).toHaveBeenCalledTimes(1)

		expect(lazy.read()).toBe('module')
	})

	it('forgets a load that fails, so the next load tries again', async () => {
		const importer = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValueOnce('module')

		const lazy = createLazyModule(importer)

		const listener = vi.fn()

		lazy.subscribe(listener)

		await expect(lazy.load()).rejects.toThrow('offline')

		expect(lazy.read()).toBeNull()

		expect(listener).not.toHaveBeenCalled()

		await expect(lazy.load()).resolves.toBe('module')

		expect(importer).toHaveBeenCalledTimes(2)

		expect(listener).toHaveBeenCalledTimes(1)
	})
})
