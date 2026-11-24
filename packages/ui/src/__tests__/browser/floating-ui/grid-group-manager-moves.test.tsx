import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { GridGroupManager } from '../../../modules/grid/grid-group-manager'
import type { GridColumnGroup } from '../../../modules/grid/grid-group-types'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * A move from a menu of the group editor changes the order of the rows on the
 * screen. The trigger of the item that moves keeps focus, so the next move
 * starts from the same control.
 */
describe('group editor menu moves (real browser)', () => {
	const items = [
		{ id: 'first', title: 'First' },
		{ id: 'last', title: 'Last' },
		{ id: 'email', title: 'Email' },
	]

	function Harness() {
		const [groups, setGroups] = useState<GridColumnGroup[]>([
			{ id: 'one', title: 'One', columns: [] },
			{ id: 'two', title: 'Two', columns: [] },
		])

		const [order, setOrder] = useState<(string | number)[]>(['first', 'last', 'email'])

		return (
			<GridGroupManager
				groups={groups}
				onGroupsChange={setGroups}
				// The column manager gives the columns in the order, as here.
				columns={order.flatMap((id) => items.filter((column) => column.id === id))}
				matches={() => true}
				hidden={new Set()}
				onToggle={() => {}}
				order={order}
				onOrderChange={setOrder}
				reorderable
			/>
		)
	}

	const rowNames = () =>
		screen.getAllByRole('checkbox').map((node) => node.getAttribute('aria-label'))

	const groupNames = () =>
		screen.getAllByRole('textbox').map((node) => (node as HTMLInputElement).value)

	it('moves a column down in its zone and keeps focus on its trigger', async () => {
		renderUI(<Harness />)

		await userEvent.click(screen.getByRole('button', { name: 'Move First' }))

		await userEvent.click(await screen.findByRole('menuitem', { name: 'Move down' }))

		await waitFor(() => expect(rowNames()[1]).toContain('First'))

		await waitFor(() => expect(screen.getByRole('button', { name: 'Move First' })).toHaveFocus())
	})

	it('moves a group up and keeps focus on its trigger', async () => {
		renderUI(<Harness />)

		await userEvent.click(screen.getByRole('button', { name: 'Move group Two' }))

		await userEvent.click(await screen.findByRole('menuitem', { name: 'Move up' }))

		await waitFor(() => expect(groupNames()).toEqual(['Two', 'One']))

		await waitFor(() =>
			expect(screen.getByRole('button', { name: 'Move group Two' })).toHaveFocus(),
		)
	})
})
