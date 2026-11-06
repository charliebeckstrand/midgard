import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { QueryBuilder, type QueryField } from '../../modules/query'
import { renderUI, screen } from '../helpers'

/**
 * The Add menu of a group portals out of the disabled fieldset, so it stays
 * open when the builder turns disabled. Its items then take the disabled state
 * of the builder, so they add no node. The menu opens through floating-ui, so
 * this runs in the browser suite (CONVENTIONS §10.3).
 */
describe('QueryBuilder disabled Add menu (real browser)', () => {
	const fields: QueryField[] = [{ name: 'name', label: 'Name', type: 'text' }]

	it('adds no node from an open Add menu once the builder turns disabled', async () => {
		const onValueChange = vi.fn()

		const { rerender } = renderUI(<QueryBuilder fields={fields} onValueChange={onValueChange} />)

		await userEvent.click(screen.getByRole('button', { name: 'Add' }))

		await screen.findByRole('menu')

		rerender(<QueryBuilder fields={fields} onValueChange={onValueChange} disabled />)

		const items = [
			screen.getByRole('menuitem', { name: 'Add rule' }),
			screen.getByRole('menuitem', { name: 'Add group' }),
		]

		for (const item of items) {
			expect(item).toHaveAttribute('aria-disabled', 'true')

			// `click()` sends the event to the item, so no pointer rule stops it.
			item.click()
		}

		expect(onValueChange).not.toHaveBeenCalled()
	})
})
