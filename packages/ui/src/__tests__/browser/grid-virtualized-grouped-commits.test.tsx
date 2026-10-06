import { Profiler } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { frame, frames, present, renderUI, waitFor, windowBody } from '../helpers'
import { animationsDone } from './helpers/signals'
import { budget } from './helpers/wall-clock'

/**
 * The React commits of one group toggle in a windowed grouped body, in a real
 * browser. A click is a discrete event, so React commits the toggle in a
 * microtask, before the next animation frame. The count holds the work that a
 * reader waits on before the first paint.
 *
 * A toggle commits twice. The toggle commit keeps the applied groups, so no
 * row changes. Its layout effect reads the window and applies the toggle in a
 * nested commit. An expand then commits once more as a nested commit: each
 * entering row opens its track in it, and the motion state drops the entering
 * rows. The two updates batch into one commit. A later commit before the frame
 * is a no-op render of the virtualizer after the rows measure, and it renders
 * no row.
 *
 * Each leaf row that renders calls the `cell` of the `name` column once, so the
 * test counts those calls in each commit. A count of rows does not change with
 * the machine. A commit time does: one stall in a commit failed a cap of a
 * quarter of the commit that applies the toggle.
 */
describe('grid virtualized grouped body commits (real browser)', () => {
	type Person = { id: number; name: string; team: string }

	const people: Person[] = Array.from({ length: 1000 }, (_, i) => ({
		id: i + 1,
		name: `Person ${i + 1}`,
		team: `Team ${String(Math.floor(i / 100)).padStart(2, '0')}`,
	}))

	it('applies a toggle in view in one nested commit before the next frame', async () => {
		const commits: { phase: string; rows: number }[] = []

		let count = false

		/** The leaf rows that rendered since the last commit. */
		let rendered = 0

		const columns: GridColumn<Person>[] = [
			{
				id: 'name',
				title: 'Name',
				cell: (r) => {
					rendered++

					return r.name
				},
				value: (r) => r.name,
			},
			{ id: 'team', title: 'Team', cell: (r) => r.team, value: (r) => r.team },
		]

		const view = renderUI(
			<Profiler
				id="grid"
				onRender={(_id, phase) => {
					if (count) commits.push({ phase, rows: rendered })

					rendered = 0
				}}
			>
				<div style={{ width: 600 }}>
					<Grid<Person>
						columns={columns}
						rows={people}
						getKey={(r) => r.id}
						groupBy={{ value: 'team' }}
						maxHeight="600px"
						virtualize
					/>
				</div>
			</Profiler>,
		)

		const body = windowBody(view.container)

		await waitFor(() => expect(body.querySelector(':scope > tr[data-index]')).not.toBeNull())

		const toggle = () =>
			present(body.querySelector<HTMLElement>(':scope > tr[data-group-row] button'), 'a toggle')

		/** Clicks the first toggle, and returns the commits before the next frame. */
		const click = async () => {
			commits.length = 0

			count = true

			toggle().click()

			await frame()

			count = false

			return [...commits]
		}

		/**
		 * Holds the commits of one toggle to the toggle, the commit that applies
		 * it, the nested commit of an expand, and no-op renders that render no
		 * row.
		 */
		const expectCommits = (toggled: typeof commits, expand: boolean) => {
			const [first, applied, ...later] = toggled

			expect(first?.phase).toBe('update')

			expect(applied?.phase).toBe('nested-update')

			// The commit that applies the toggle renders rows, so the count is live.
			expect(applied?.rows).toBeGreaterThan(0)

			if (expand) expect(later.shift()?.phase).toBe('nested-update')

			for (const commit of later) {
				expect(commit.phase).toBe('update')

				expect(commit.rows).toBe(0)
			}
		}

		/** Waits until the reveal of each row lands, and the body is at rest. */
		const rest = async () => {
			await animationsDone(body, budget(1200))

			await frames()
		}

		// The first collapse and expand also measure each row once, so the counted
		// runs start after them.
		await click()

		await rest()

		await click()

		await rest()

		for (let run = 0; run < 2; run++) {
			expect(toggle()).toHaveAccessibleName(/^Collapse group/)

			expectCommits(await click(), false)

			await rest()

			expect(toggle()).toHaveAccessibleName(/^Expand group/)

			expectCommits(await click(), true)

			await rest()
		}
	})
})
