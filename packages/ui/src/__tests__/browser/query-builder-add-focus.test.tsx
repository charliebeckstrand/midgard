import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { QueryBuilder, type QueryField } from '../../modules/query'
import { renderUI, screen, waitFor, within } from '../helpers'

/**
 * An add from the Add menu moves the focus to the first control of the new
 * node (WCAG 2.4.3). The menu closes in the same step, and its close gives the
 * focus back to its trigger. The add must still take the focus, so this runs
 * with the real menu and the real focus of the browser (CONVENTIONS §10.3).
 */
describe('QueryBuilder add focus (real browser)', () => {
	const fields: QueryField[] = [{ name: 'name', label: 'Name', type: 'text' }]

	async function add(item: string) {
		await userEvent.click(screen.getByRole('button', { name: 'Add' }))

		await userEvent.click(await screen.findByRole('menuitem', { name: item }))

		await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
	}

	it('focuses the field select of a new rule after the menu closes', async () => {
		renderUI(<QueryBuilder fields={fields} />)

		await add('Add rule')

		expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Field' }))
	})

	it('focuses the field select in a new group after the menu closes', async () => {
		renderUI(<QueryBuilder fields={fields} />)

		await add('Add group')

		const group = screen.getByRole('group', { name: 'Condition group' })

		expect(document.activeElement).toBe(within(group).getByRole('combobox', { name: 'Field' }))
	})
})
