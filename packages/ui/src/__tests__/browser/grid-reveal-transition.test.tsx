import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, userEvent, waitFor } from '../helpers'

/**
 * Real-browser check that a grid's collapsible rows animate in both directions.
 * A collapsed row rests in `<Activity mode="hidden">` at `display: none`, and a
 * transition needs a rendered style to run from — so a wake that lifted the rest
 * and opened the reveal in one commit used to snap open and animate only closed.
 * `useGridRevealHold` splits that wake in two, which no jsdom test can see: the
 * reveal is a CSS transition on `grid-template-rows`, and jsdom runs none.
 *
 * `transitionrun` is the probe rather than the computed track size, since it
 * fires when the browser creates the transition and does not depend on when the
 * assertion samples the tween.
 */
describe('grid reveal transition (real browser)', () => {
	type Person = { id: number; name: string; role: string }

	const people: Person[] = [
		{ id: 1, name: 'Wade', role: 'Developer' },
		{ id: 2, name: 'Arlene', role: 'Designer' },
	]

	const getKey = (row: Person) => row.id

	/** Collects the properties whose transitions start under `root`; they bubble. */
	function watchTransitions(root: HTMLElement): string[] {
		const runs: string[] = []

		root.addEventListener('transitionrun', (event) => {
			runs.push((event as TransitionEvent).propertyName)
		})

		return runs
	}

	/** The reveal tween, told apart from the expander chevron's `transform`. */
	const REVEAL = 'grid-template-rows'

	it('animates a detail panel open and closed', async () => {
		const user = userEvent.setup()

		const columns: GridColumn<Person>[] = [
			{ id: 'expand', expander: true },
			{ id: 'name', title: 'Name', cell: (row) => row.name },
		]

		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={people}
				getKey={getKey}
				expandable={{ render: (row) => <div style={{ height: 80 }}>Detail for {row.name}</div> }}
			/>,
		)

		const runs = watchTransitions(container)

		await user.click(screen.getByRole('button', { name: 'Expand details for row 1' }))

		await waitFor(() => expect(runs).toContain(REVEAL))

		runs.length = 0

		await user.click(screen.getByRole('button', { name: 'Collapse details for row 1' }))

		await waitFor(() => expect(runs).toContain(REVEAL))
	})

	it('animates a group open and closed', async () => {
		const user = userEvent.setup()

		const columns: GridColumn<Person>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
			{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
		]

		const { container } = renderUI(
			<Grid columns={columns} rows={people} getKey={getKey} groupBy={{ value: 'role' }} />,
		)

		const toggle = screen.getAllByRole('button', { name: /group/ })[0]

		if (!toggle) throw new Error('group toggle did not render')

		const leaf = screen.getByText('Wade').closest('tr')

		if (!leaf) throw new Error('group leaf row did not render')

		const runs = watchTransitions(container)

		await user.click(toggle)

		await waitFor(() => expect(runs).toContain(REVEAL))

		// Groups open by default, so only the reopen exercises the wake — and only
		// once the collapse has landed and the leaf rests at `display: none`.
		await waitFor(() => expect(getComputedStyle(leaf).display).toBe('none'))

		runs.length = 0

		await user.click(toggle)

		await waitFor(() => expect(runs).toContain(REVEAL))
	})
})
