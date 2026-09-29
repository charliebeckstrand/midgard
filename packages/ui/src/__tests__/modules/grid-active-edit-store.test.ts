import { describe, expect, it, vi } from 'vitest'
import { createActiveEditStore } from '../../modules/grid/use-grid-editing'

/**
 * The store that tells each editing cell of the session's coord and editable
 * rows. Each notice makes every mounted cell read its flag again.
 */
describe('createActiveEditStore', () => {
	it('notifies once for a set of editable rows built again with the same keys', () => {
		const store = createActiveEditStore()

		const listener = vi.fn()

		store.subscribe(listener)

		store.setRows(new Set([1, 2]))

		store.setRows(new Set([2, 1]))

		expect(listener).toHaveBeenCalledTimes(1)

		expect(store.rows()).toEqual(new Set([2, 1]))

		store.setRows(new Set([1]))

		expect(listener).toHaveBeenCalledTimes(2)
	})
})
