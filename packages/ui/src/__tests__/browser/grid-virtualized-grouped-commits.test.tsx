import { Profiler } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { frames, present, renderUI, waitFor, windowBody } from '../helpers'

/**
 * The React commits of one group toggle in a windowed grouped body, in a real
 * browser. A click is a discrete event, so React commits the toggle in a
 * microtask, before the next animation frame. The count holds the work that a
 * reader waits on before the first paint.
 *
 * A collapse commits once. An expand commits once, and then once more as a
 * nested commit: each entering row opens its track in it, and the motion state
 * drops the entering rows. The two updates batch into one commit. A later
 * commit before the frame is a no-op render of the virtualizer after the rows
 * measure. The test holds such a commit to a quarter of the toggle commit, so
 * that one more render of the body fails.
 */
describe('grid virtualized grouped body commits (real browser)', () => {
	type Person = { id: number; name: string; team: string }

	const people: Person[] = Array.from({ length: 1000 }, (_, i) => ({
		id: i + 1,
		name: `Person ${i + 1}`,
		team: `Team ${String(Math.floor(i / 100)).padStart(2, '0')}`,
	}))

	const columns: GridColumn<Person>[] = [
		{ id: 'name', title: 'Name', cell: (r) => r.name, value: (r) => r.name },
		{ id: 'team', title: 'Team', cell: (r) => r.team, value: (r) => r.team },
	]

	it('renders the body at most twice for a toggle in view before the next frame', async () => {
		const commits: { phase: string; duration: number }[] = []

		let count = false

		const view = renderUI(
			<Profiler
				id="grid"
				onRender={(_id, phase, duration) => {
					if (count) commits.push({ phase, duration })
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

			await new Promise((resolve) => requestAnimationFrame(resolve))

			count = false

			return [...commits]
		}

		/**
		 * Holds the commits of one toggle to the toggle, the nested commit of an
		 * expand, and no-op renders.
		 */
		const expectCommits = (toggled: typeof commits, expand: boolean) => {
			const [first, ...later] = toggled

			expect(first?.phase).toBe('update')

			if (expand) expect(later.shift()?.phase).toBe('nested-update')

			const budget = (first?.duration ?? 0) / 4

			for (const commit of later) {
				expect(commit.phase).toBe('update')

				expect(commit.duration).toBeLessThan(budget)
			}
		}

		/** Waits until the reveal of each row lands, and the body is at rest. */
		const rest = async () => {
			await new Promise((resolve) => setTimeout(resolve, 1200))

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
