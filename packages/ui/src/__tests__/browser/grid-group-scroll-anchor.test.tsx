import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import {
	frames,
	getSlot,
	nonEmpty,
	present,
	renderUI,
	sampleDrift,
	waitFor,
	windowBody,
} from '../helpers'

/**
 * The flat grouped body against the native scroll anchoring of the browser.
 * The body has no window, so the grid scroller keeps the default
 * `overflow-anchor: auto`. Each case holds a row in view to a drift of one
 * pixel.
 *
 * A group that collapses at the scroll end clamps the scroll offset. Chromium
 * kept its anchor through the clamp, with a correction equal to the leaves of
 * the group. The next expand then moved the rows in view up by the leaves.
 *
 * Each case runs under client and manual grouping, with and without
 * `resizable`. A resizable grid renders a `<colgroup>`, which the native anchor
 * skips. Before, Chromium selected the first `<col>` as its anchor, and no
 * native correction held the view when a group above the viewport toggled.
 */
describe('grid grouped body under native scroll anchoring (real browser)', () => {
	type Item = { id: number; name: string; team: string; header?: boolean }

	// 12 groups of 5 rows.
	const rows: Item[] = Array.from({ length: 60 }, (_, index) => ({
		id: index + 1,
		name: `Row ${index + 1}`,
		team: `Team ${String(Math.floor(index / 5)).padStart(2, '0')}`,
	}))

	const teams = Array.from(new Set(rows.map((row) => row.team)))

	// Manual grouping reads a header row before the leaves of each group.
	const manualRows: Item[] = teams.flatMap((team, index) => [
		{ id: 1000 + index, name: team, team, header: true },
		...rows.filter((row) => row.team === team),
	])

	const columns: GridColumn<Item>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'team', title: 'Team', cell: (row) => row.team, value: (row) => row.team },
	]

	type Mode = 'client' | 'manual'

	function Harness({ mode, resizable }: { mode: Mode; resizable: boolean }) {
		const [expanded, setExpanded] = useState<Set<string | number>>(new Set(teams))

		return (
			<div style={{ width: 500 }}>
				<Grid<Item>
					columns={columns}
					rows={mode === 'client' ? rows : manualRows}
					getKey={(row) => row.id}
					resizable={resizable}
					maxHeight="400px"
					header={{ position: 'sticky' }}
					groupBy={
						mode === 'client'
							? { value: 'team' }
							: {
									manual: true,
									value: 'team',
									expanded,
									onExpandedChange: setExpanded,
									groupRow: (row) =>
										row.header ? { key: row.team, value: row.team, count: 5 } : null,
								}
					}
				/>
			</div>
		)
	}

	/** Renders the grid, and returns its scroller and the queries of its rows. */
	const renderGrid = vi.defineHelper(async (mode: Mode, resizable: boolean) => {
		const view = renderUI(<Harness mode={mode} resizable={resizable} />)

		const scroll = getSlot(view.container, 'grid-scroll')

		const body = windowBody(view.container)

		await waitFor(() => expect(body.querySelector(':scope > tr[data-group-row]')).not.toBeNull())

		expect(getComputedStyle(scroll).overflowAnchor).toBe('auto')

		expect(scroll.querySelector('colgroup') !== null).toBe(resizable)

		const toggle = (team: string) =>
			present(
				// The toggle is named by its visible label, the team and its count.
				[...body.querySelectorAll<HTMLElement>('tr[data-group-row] button[aria-expanded]')].find(
					(button) => button.textContent?.startsWith(`${team} (`),
				),
				`the toggle of ${team}`,
			)

		const header = (team: string) => () => toggle(team).closest<HTMLElement>('tr')

		const leaf = (id: number) => () =>
			body.querySelector<HTMLElement>(`:scope > tr[data-grid-row="${id}"]`)

		// The leaves of a group, which have the ids after the ids of the groups before it.
		const leaves = (team: string) => {
			const first = teams.indexOf(team) * 5 + 1

			return Array.from({ length: 5 }, (_, index) => leaf(first + index))
		}

		return { scroll, toggle, header, leaf, leaves }
	})

	for (const mode of ['client', 'manual'] as const) {
		for (const resizable of [true, false]) {
			it(`holds the view still when a group at the scroll end collapses and expands again (${mode}, resizable: ${resizable})`, async () => {
				const { scroll, toggle, header, leaves } = await renderGrid(mode, resizable)

				for (let i = 0; i < 4; i++) {
					scroll.scrollTop = scroll.scrollHeight

					await frames()
				}

				const [team] = nonEmpty(teams.toReversed(), 'group')

				const beforeCollapse = scroll.scrollTop

				toggle(team).click()

				// The reveal lands when each leaf of the group has no height.
				await waitFor(() => {
					for (const row of leaves(team)) expect(row()?.getBoundingClientRect().height ?? 0).toBe(0)
				})

				await frames(3)

				expect(scroll.scrollTop).toBeLessThan(beforeCollapse)

				const beforeExpand = present(header(team)(), 'the header').getBoundingClientRect().top

				toggle(team).click()

				expect(await sampleDrift(header(team), beforeExpand, 30)).toBeLessThanOrEqual(1)
			})

			it(`holds the view still when a group above the viewport collapses and expands (${mode}, resizable: ${resizable})`, async () => {
				const { scroll, toggle, leaf, leaves } = await renderGrid(mode, resizable)

				// Once in the middle, and once at the scroll end, where a collapse above
				// the viewport clamps the offset before the group expands again.
				for (const at of [1000, scroll.scrollHeight]) {
					scroll.scrollTop = at

					await frames(4)

					const top = scroll.getBoundingClientRect().top

					// The last group whose leaves all end above the viewport.
					const [team] = nonEmpty(
						teams
							.filter(
								(candidate) =>
									(leaves(candidate).at(-1)?.()?.getBoundingClientRect().bottom ?? 0) < top,
							)
							.toReversed(),
						'group above the viewport',
					)

					const inView = present(
						rows
							.map((row) => leaf(row.id)())
							.find((row) => row && row.getBoundingClientRect().top > top + 50),
						'a row in view',
					)

					const anchor = leaf(Number(inView.dataset.gridRow))

					for (let i = 0; i < 2; i++) {
						const before = present(anchor(), 'the anchor').getBoundingClientRect().top

						toggle(team).click()

						expect(await sampleDrift(anchor, before, 20)).toBeLessThanOrEqual(1)
					}
				}
			})
		}
	}
})
