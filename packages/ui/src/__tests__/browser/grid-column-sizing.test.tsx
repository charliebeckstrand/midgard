import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Grid,
	type GridColumn,
	type GridColumnSizingState,
	type GridProps,
} from '../../modules/grid'
import { fireEvent, present, renderUI, screen, waitFor } from '../helpers'
import { pause } from './helpers/wall-clock'

/**
 * The column-width rules against a real layout engine. Each case pins one rule
 * of `createColumnSizer`: a user width change holds through every later trigger,
 * the two auto-size actions agree, a controlled binding still runs them, and a
 * reset gives the widths back to the grid. jsdom paints no layout, so the
 * sizer stands down there; these cases need the browser.
 */
describe('grid column sizing rules (real browser)', () => {
	type Row = { id: number; a: string; b: string; c: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'a', title: 'A', cell: (row) => row.a },
		{ id: 'b', title: 'B', cell: (row) => row.b },
		{ id: 'c', title: 'C', cell: (row) => row.c },
	]

	const rows: Row[] = Array.from({ length: 4 }, (_, i) => ({
		id: i + 1,
		a: 'a',
		b: 'A value of middle length',
		c: 'c',
	}))

	const getKey = (row: Row) => row.id

	const frame = (width: number, grid: ReactElement) => (
		<div style={{ width: `${width}px` }}>{grid}</div>
	)

	const header = (root: HTMLElement, id: string) =>
		present(root.querySelector(`th[data-grid-col="${id}"]`), `th[data-grid-col="${id}"]`)

	const width = (root: HTMLElement, id: string) =>
		Math.round(header(root, id).getBoundingClientRect().width)

	const widths = (root: HTMLElement, ids = ['a', 'b', 'c']) => ids.map((id) => width(root, id))

	/** Runs a width action from a column's header menu, under its Auto-size parent. */
	function menuAction(root: HTMLElement, id: string, label: string) {
		fireEvent.contextMenu(header(root, id))

		const parent = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
			(el) => el.textContent?.trim() === 'Auto-size',
		)

		if (!parent) throw new Error('no Auto-size menu')

		fireEvent.click(parent)

		const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
			el.textContent?.includes(label),
		)

		if (!item) throw new Error(`no ${label} item`)

		fireEvent.click(item)
	}

	/** Drags a column's resize handle by `dx` px, or presses it without motion when `dx` is 0. */
	function drag(root: HTMLElement, label: string, dx: number) {
		const handle = present(
			root.querySelector<HTMLElement>(`[role="separator"][aria-label="Resize ${label}"]`),
			`Resize ${label}`,
		)

		const rect = handle.getBoundingClientRect()

		const x = rect.left + rect.width / 2

		const y = rect.top + rect.height / 2

		fireEvent.mouseDown(handle, { clientX: x, clientY: y })

		if (dx !== 0) fireEvent.mouseMove(document, { clientX: x + dx, clientY: y })

		fireEvent.mouseUp(document, { clientX: x + dx, clientY: y })
	}

	/** Mounts the grid in a 600px frame, and waits for the fill. */
	async function mount(extra: Partial<GridProps<Row>> = {}) {
		const view = (frameWidth: number) =>
			frame(frameWidth, <Grid resizable columns={columns} rows={rows} getKey={getKey} {...extra} />)

		const result = renderUI(view(600))

		await waitFor(() => expect(width(result.container, 'a')).toBeGreaterThan(60))

		return { ...result, resizeFrame: (next: number) => result.rerender(view(next)) }
	}

	it('holds a dragged width through a container resize', async () => {
		const { container, resizeFrame } = await mount()

		drag(container, 'A', 80)

		await waitFor(() => expect(width(container, 'a')).toBeGreaterThan(200))

		const held = widths(container)

		resizeFrame(800)

		await pause(50)

		expect(widths(container)).toEqual(held)
	})

	it('holds every column after "Auto-size this column", through a container resize', async () => {
		const { container, resizeFrame } = await mount()

		const before = widths(container)

		menuAction(container, 'a', 'Auto-size this column')

		await waitFor(() => expect(width(container, 'a')).toBeLessThan(before[0] ?? 0))

		const held = widths(container)

		// The other columns keep the widths they had.
		expect(held.slice(1)).toEqual(before.slice(1))

		resizeFrame(800)

		await pause(50)

		expect(widths(container)).toEqual(held)
	})

	it('gives each column the width "Auto-size this column" gives it', async () => {
		const all = await mount()

		menuAction(all.container, 'a', 'Auto-size all columns')

		await waitFor(() => expect(width(all.container, 'a')).toBeLessThan(100))

		const fitted = widths(all.container)

		all.unmount()

		const each = await mount()

		for (const id of ['a', 'b', 'c']) {
			menuAction(each.container, id, 'Auto-size this column')

			await pause(20)
		}

		expect(widths(each.container)).toEqual(fitted)

		// Content widths spend no spare width, so the table leaves it empty.
		expect(fitted.reduce((sum, value) => sum + value, 0)).toBeLessThan(600)
	})

	it('keeps an auto-sized long column whole after another column hides', async () => {
		const long = `${'A long value that runs well past the automatic runaway-cell cap '.repeat(3)}end`

		const wide: GridColumn<Row>[] = [
			{ id: 'a', title: 'A', cell: (row) => row.a },
			{ id: 'b', title: 'B', cell: () => long },
			{ id: 'c', title: 'C', cell: (row) => row.c },
		]

		const view = (hidden: Set<string | number>) =>
			frame(
				600,
				<Grid
					resizable
					columns={wide}
					rows={rows}
					getKey={getKey}
					columnManager={{ hidden, onHiddenChange: () => {} }}
				/>,
			)

		const { container, rerender } = renderUI(view(new Set()))

		await waitFor(() => expect(width(container, 'b')).toBeGreaterThan(400))

		menuAction(container, 'b', 'Auto-size all columns')

		await waitFor(() => expect(width(container, 'b')).toBeGreaterThan(600))

		const whole = width(container, 'b')

		rerender(view(new Set(['c'])))

		await waitFor(() => expect(container.querySelector('th[data-grid-col="c"]')).toBeNull())

		expect(width(container, 'b')).toBe(whole)
	})

	it('runs the auto-size actions under a controlled columnSizing', async () => {
		const onValueChange = vi.fn()

		const value: GridColumnSizingState = { a: 300, b: 150, c: 150 }

		const { container } = renderUI(
			frame(
				600,
				<Grid
					resizable
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnSizing={{ value, onValueChange }}
				/>,
			),
		)

		await waitFor(() => expect(width(container, 'a')).toBe(300))

		menuAction(container, 'a', 'Auto-size this column')

		// The consumer owns the widths, so the action reports its width and moves
		// nothing on its own.
		await waitFor(() => expect(onValueChange).toHaveBeenCalled())

		const reported = onValueChange.mock.lastCall?.[0] as GridColumnSizingState

		expect(reported.a).toBeLessThan(100)

		expect(reported.b).toBe(150)

		// A controlled value is a saved preference, so "all" confirms first.
		menuAction(container, 'a', 'Auto-size all columns')

		fireEvent.click(await screen.findByRole('button', { name: 'Auto-size columns' }))

		await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2))

		const all = onValueChange.mock.lastCall?.[0] as GridColumnSizingState

		expect(all.a).toBe(reported.a)

		expect(all.c).toBeLessThan(150)
	})

	it('"Reset column widths" restores the fill and clears the saved widths', async () => {
		const onValueChange = vi.fn()

		const { container, resizeFrame } = await mount({ columnSizing: { onValueChange } })

		const fill = widths(container)

		drag(container, 'A', 80)

		await waitFor(() => expect(width(container, 'a')).toBeGreaterThan(fill[0] ?? 0))

		menuAction(container, 'a', 'Reset column widths')

		await waitFor(() => expect(widths(container)).toEqual(fill))

		expect(onValueChange).toHaveBeenLastCalledWith({})

		// Auto mode again: a container resize fits the columns to the new width.
		resizeFrame(800)

		await waitFor(() =>
			expect(widths(container).reduce((sum, value) => sum + value, 0)).toBeGreaterThan(780),
		)
	})

	it('takes no width control on a press of the handle without a drag', async () => {
		const { container, resizeFrame } = await mount()

		drag(container, 'A', 0)

		await pause(20)

		resizeFrame(800)

		// Still auto mode: the columns fill the wider frame.
		await waitFor(() =>
			expect(widths(container).reduce((sum, value) => sum + value, 0)).toBeGreaterThan(780),
		)
	})
})
