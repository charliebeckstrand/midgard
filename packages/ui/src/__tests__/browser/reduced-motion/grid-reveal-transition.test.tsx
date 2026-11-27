import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { renderUI, screen, waitFor } from '../../helpers'

type Person = { id: number; name: string; role: string }

const people: Person[] = [
	{ id: 1, name: 'Wade', role: 'Developer' },
	{ id: 2, name: 'Arlene', role: 'Designer' },
]

const columns: GridColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
]

/** The reveal tween, told apart from the expander chevron's `transform`. */
const REVEAL = 'grid-template-rows'

/**
 * Real-browser check of the collapsible rows of a grid for a reader who asks
 * for reduced motion. The recipe gives the reveal its transition only behind
 * `motion-safe:`, so no `transitionend` comes. `useGridRevealHold` reads the
 * platform setting live and rests the row on the toggle. If the hook and the
 * CSS disagree, a collapsed row waits for a landing that never comes, and it
 * stays live. A `matchMedia` stub cannot show this, because the CSS reads the
 * real media query. `grid-reveal-transition.test.tsx` of the `browser`
 * instance holds the reveal for full motion.
 */
describe('grid reveal under reduced motion (real browser)', () => {
	it('rests a collapsed group row with no reveal, and shows it again with none', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Grid columns={columns} rows={people} getKey={(row) => row.id} groupBy={{ value: 'role' }} />,
		)

		const toggle = screen.getAllByRole('button', { name: /\(\d+\)$/, expanded: true })[0]

		if (!toggle) throw new Error('group toggle did not render')

		const leaf = screen.getByText('Wade').closest('tr')

		if (!leaf) throw new Error('group leaf row did not render')

		const runs: string[] = []

		container.addEventListener('transitionrun', (event) => {
			runs.push((event as TransitionEvent).propertyName)
		})

		await user.click(toggle)

		await waitFor(() => expect(getComputedStyle(leaf).display).toBe('none'))

		await user.click(toggle)

		await waitFor(() => expect(getComputedStyle(leaf).display).not.toBe('none'))

		expect(runs).not.toContain(REVEAL)
	})
})
