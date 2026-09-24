import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { frames, getSlot, present, renderUI, sampleDrift, waitFor, windowBody } from '../helpers'

/**
 * The windowed grid body against the native scroll anchoring of the browser.
 * The grid scroller keeps the default `overflow-anchor: auto`. The start anchor
 * of the window holds the first row in view when an item above it changes.
 * Two corrections to one change can stack, so each case holds a row in view
 * to a drift of one pixel.
 *
 * Each case runs with and without `resizable`. A resizable grid renders a
 * `<colgroup>`, and Chromium then selects no anchor node in the table. A grid
 * that is not resizable has no `<colgroup>`, so the native correction is live.
 * The start anchor writes an absolute offset in a layout effect, so the two do
 * not stack.
 */
describe('grid virtualized body under native scroll anchoring (real browser)', () => {
	async function settle(count = 3) {
		for (let i = 0; i < count; i++) await frames()
	}

	describe('grouped body', () => {
		type Person = { id: number; name: string; team: string; note: string }

		// 40 groups of 10 rows. Each note has a different length, so the rows do
		// not share one height.
		const people: Person[] = Array.from({ length: 400 }, (_, i) => ({
			id: i + 1,
			name: `Person ${i + 1}`,
			team: `Team ${String(Math.floor(i / 10)).padStart(2, '0')}`,
			note: 'lorem ipsum '.repeat(1 + ((i * 7) % 13)).trim(),
		}))

		const columns: GridColumn<Person>[] = [
			{ id: 'name', title: 'Name', width: 120, cell: (r) => r.name, value: (r) => r.name },
			{ id: 'team', title: 'Team', width: 100, cell: (r) => r.team, value: (r) => r.team },
			{ id: 'note', title: 'Note', width: 200, cell: (r) => r.note, value: (r) => r.note },
		]

		for (const resizable of [true, false]) {
			it(`holds the view still when one group above the viewport collapses and expands (resizable: ${resizable})`, async () => {
				const view = renderUI(
					<div style={{ width: 560 }}>
						<Grid<Person>
							columns={columns}
							rows={people}
							getKey={(r) => r.id}
							groupBy={{ value: 'team' }}
							groupTotalRow
							truncate={false}
							resizable={resizable}
							maxHeight="400px"
							header={{ position: 'sticky' }}
							// The overscan keeps a whole group above the viewport rendered, so
							// its header button is in the DOM.
							virtualize={{ estimateSize: 44, overscan: 30 }}
						/>
					</div>,
				)

				const scroll = getSlot(view.container, 'grid-scroll')

				const body = windowBody(view.container)

				await waitFor(() => expect(body.querySelector(':scope > tr[data-index]')).not.toBeNull())

				expect(getComputedStyle(scroll).overflowAnchor).toBe('auto')

				expect(scroll.querySelector('colgroup') !== null).toBe(resizable)

				// Scroll down in steps, so that the rows above the viewport measure.
				for (let top = 0; top <= 6000; top += 300) {
					scroll.scrollTop = top

					await settle(1)
				}

				await settle(4)

				const edge = present(
					scroll.querySelector('thead th'),
					'a head cell',
				).getBoundingClientRect().bottom

				const anchorRow = present(
					Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-grid-row]')).find(
						(row) => row.getBoundingClientRect().top > edge + 20,
					),
					'a data row in view',
				)

				const anchorKey = anchorRow.dataset.gridRow

				const anchorTeam = people.find((p) => String(p.id) === anchorKey)?.team

				const scrollTop = scroll.getBoundingClientRect().top

				const header = present(
					Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-group-row]'))
						.filter(
							(row) =>
								row.getBoundingClientRect().bottom < scrollTop &&
								row.dataset.groupKey !== anchorTeam,
						)
						.at(-1),
					'a group header above the viewport',
				)

				const key = header.dataset.groupKey

				const anchor = () =>
					body.querySelector<HTMLElement>(`:scope > tr[data-grid-row="${anchorKey}"]`)

				const toggle = (label: string) =>
					present(
						body.querySelector<HTMLElement>(
							`:scope > tr[data-group-key="${key}"] button[aria-label="${label} group ${key}"]`,
						),
						`the ${label} button`,
					).click()

				for (const label of ['Collapse', 'Expand']) {
					const before = present(anchor(), 'the anchor').getBoundingClientRect().top

					toggle(label)

					expect(await sampleDrift(anchor, before, 30)).toBeLessThanOrEqual(1)
				}
			})
		}
	})

	describe('master-detail body', () => {
		type Item = { id: number; name: string; height: number }

		const rows: Item[] = Array.from({ length: 300 }, (_, i) => ({
			id: i + 1,
			name: `Row ${i + 1}`,
			height: 60 + ((i * 37) % 240),
		}))

		const columns: GridColumn<Item>[] = [
			{ id: 'expand', expander: true },
			{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		]

		for (const resizable of [true, false]) {
			it(`holds the view still when a panel above the viewport opens and closes (resizable: ${resizable})`, async () => {
				const control: { set: (keys: Set<string | number>) => void } = { set: () => {} }

				function Harness() {
					const [value, setValue] = useState<Set<string | number>>(new Set())

					control.set = setValue

					return (
						<div style={{ width: 500 }}>
							<Grid<Item>
								columns={columns}
								rows={rows}
								getKey={(row) => row.id}
								resizable={resizable}
								maxHeight="400px"
								header={{ position: 'sticky' }}
								// A row measures 46 pixels, so each first guess is wrong.
								virtualize={{ estimateSize: 40, overscan: 4 }}
								expandable={{
									value,
									onValueChange: setValue,
									render: (row) => <div style={{ height: row.height }}>Detail {row.name}</div>,
								}}
							/>
						</div>
					)
				}

				const view = renderUI(<Harness />)

				const scroll = getSlot(view.container, 'grid-scroll')

				const body = windowBody(view.container)

				await waitFor(() => expect(body.querySelector(':scope > tr[data-index]')).not.toBeNull())

				expect(getComputedStyle(scroll).overflowAnchor).toBe('auto')

				scroll.scrollTop = 2000

				await settle(4)

				const dataRows = () =>
					Array.from(body.querySelectorAll<HTMLElement>(':scope > tr[data-grid-row]'))

				const top = scroll.getBoundingClientRect().top

				// Two rows above the viewport, one after the other.
				for (const pick of [-1, -2]) {
					const above = present(
						dataRows()
							.filter((row) => row.getBoundingClientRect().bottom < top)
							.at(pick),
						'a row above the viewport',
					)

					const inView = present(
						dataRows().find((row) => row.getBoundingClientRect().top > top + 50),
						'a row in view',
					)

					// The window can mount a new node for the same row, so find it by key.
					const anchor = () =>
						body.querySelector<HTMLElement>(
							`:scope > tr[data-grid-row="${inView.dataset.gridRow}"]`,
						)

					const key = Number(above.dataset.gridRow)

					const beforeOpen = inView.getBoundingClientRect().top

					control.set(new Set([key]))

					expect(await sampleDrift(anchor, beforeOpen, 20)).toBeLessThanOrEqual(1)

					const beforeClose = present(anchor(), 'the anchor').getBoundingClientRect().top

					control.set(new Set())

					expect(await sampleDrift(anchor, beforeClose, 20)).toBeLessThanOrEqual(1)
				}
			})
		}
	})
})
