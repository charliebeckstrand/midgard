import { useCallback, useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useVirtualWindow } from '../../hooks'
import { VirtualOptions } from '../../primitives/virtual-options'
import { act, frames, renderUI, waitFor } from '../helpers'

/**
 * Virtualization windowing (real browser). With a real layout engine the
 * virtualizer measures an actual viewport; asserts that a windowed subset
 * renders and that the window tracks scroll position, behaviour jsdom can't
 * exercise (zero-size scroll container → zero rendered rows).
 *
 * Coverage spans the two production windowing seams: `useVirtualWindow` (the
 * hook Grid's virtualized body delegates to, exercised in a minimal real
 * table on its uniform path and in a list of mixed-height rows on its measured
 * path) and `VirtualOptions` (the primitive that windows Combobox/Listbox
 * options). Most harnesses supply a fixed height. One list has only a
 * `max-height`, which sizes the scroller from its content.
 *
 * The full Grid component is not driven here: its render lifecycle never
 * initialises the virtualizer on an isolated headless mount (CONVENTIONS §10.3).
 * Its windowing is covered by the benchmarks; `useVirtualWindow` is the shared
 * hook exercised below.
 */

const TABLE_HEIGHT = 300

const ROW_HEIGHT = 44

/** Minimal real table over `useVirtualWindow`, mirroring Grid's virtualized body. */
function VirtualTable({ count }: { count: number }) {
	const scrollRef = useRef<HTMLDivElement>(null)

	const { virtualItems, topSpacer, bottomSpacer } = useVirtualWindow({
		count,
		getScrollElement: () => scrollRef.current,
		estimateSize: ROW_HEIGHT,
		overscan: 10,
	})

	return (
		<div
			ref={scrollRef}
			data-slot="virtual-table"
			style={{ height: TABLE_HEIGHT, overflow: 'auto' }}
		>
			<table>
				<tbody>
					{topSpacer > 0 && (
						<tr data-slot="virtual-table-spacer">
							<td style={{ height: topSpacer }} />
						</tr>
					)}
					{virtualItems.map((virtualItem) => (
						<tr key={virtualItem.index}>
							<td>Row {virtualItem.index}</td>
						</tr>
					))}
					{bottomSpacer > 0 && (
						<tr data-slot="virtual-table-spacer">
							<td style={{ height: bottomSpacer }} />
						</tr>
					)}
				</tbody>
			</table>
		</div>
	)
}

describe('useVirtualWindow table windowing', () => {
	function dataRows(root: ParentNode) {
		return Array.from(root.querySelectorAll('tbody tr:not([data-slot="virtual-table-spacer"])'))
	}

	it('renders only the windowed subset of 500 rows', async () => {
		const { container } = renderUI(<VirtualTable count={500} />)

		// A 300px viewport over 44px rows windows to ~17 rows, not all 500.
		await waitFor(() => {
			const count = dataRows(container).length

			expect(count).toBeGreaterThan(0)

			expect(count).toBeLessThan(100)
		})
	})

	it('advances the window as the container scrolls', async () => {
		const { container } = renderUI(<VirtualTable count={500} />)

		await waitFor(() => expect(dataRows(container).length).toBeGreaterThan(0))

		// Initial window shows the head of the list.
		expect(container.textContent).toContain('Row 0')

		expect(container.textContent).not.toContain('Row 200')

		const scroller = container.querySelector<HTMLElement>('[data-slot="virtual-table"]')

		if (!scroller) throw new Error('scroll container not found')

		scroller.scrollTop = 200 * ROW_HEIGHT

		scroller.dispatchEvent(new Event('scroll'))

		// After scrolling, the window has advanced to deeper rows.
		await waitFor(() => {
			expect(container.textContent).toContain('Row 200')

			expect(container.textContent).not.toContain('Row 0')
		})
	})
})

/** Real height of a mixed-height row: 30, 60 or 90 pixels by its id, never the estimate of 45. */
const mixedHeight = (id: number) => 30 + (id % 3) * 30

const MIXED_ESTIMATE = 45

type MeasuredListHandle = { prepend: (ids: number[]) => void }

/** Minimal measured list over `useVirtualWindow`: mixed-height rows keyed by their ids. */
function MeasuredList({
	count,
	handle,
	estimate = MIXED_ESTIMATE,
}: {
	count: number
	handle?: MeasuredListHandle
	estimate?: number
}) {
	const scrollRef = useRef<HTMLDivElement>(null)

	const [ids, setIds] = useState(() => Array.from({ length: count }, (_, i) => i))

	if (handle) handle.prepend = (next) => setIds((current) => [...next, ...current])

	const getItemKey = useCallback((index: number) => ids[index] ?? index, [ids])

	const { virtualItems, topSpacer, bottomSpacer, measureRef } = useVirtualWindow({
		count: ids.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: estimate,
		overscan: 2,
		getItemKey,
	})

	return (
		<div ref={scrollRef} data-slot="measured-list" style={{ height: 300, overflow: 'auto' }}>
			<div style={{ height: topSpacer }} />
			{virtualItems.map((virtualItem) => {
				const id = ids[virtualItem.index] ?? -1

				return (
					<div
						key={virtualItem.key}
						ref={measureRef}
						data-index={virtualItem.index}
						data-slot="measured-row"
						data-start={virtualItem.start}
						style={{ height: mixedHeight(id) }}
					>
						Row {id}
					</div>
				)
			})}
			<div style={{ height: bottomSpacer }} />
		</div>
	)
}

describe('useVirtualWindow measured windowing', () => {
	/** Each rendered row's real offset in the content, beside the start the window gave it. */
	function placements(root: ParentNode) {
		const scroller = root.querySelector<HTMLElement>('[data-slot="measured-list"]')

		if (!scroller) throw new Error('scroll container not found')

		const origin = scroller.getBoundingClientRect().top - scroller.scrollTop

		return Array.from(root.querySelectorAll<HTMLElement>('[data-slot="measured-row"]')).map(
			(row) => ({
				text: row.textContent,
				offset: Math.round(row.getBoundingClientRect().top - origin),
				start: Number(row.dataset.start),
			}),
		)
	}

	/** Pixel offset of row `id` when every row above it has its real height. */
	function realOffset(id: number) {
		let offset = 0

		for (let i = 0; i < id; i++) offset += mixedHeight(i)

		return offset
	}

	it('places each row at the start its measured neighbours give it', async () => {
		const { container } = renderUI(<MeasuredList count={500} />)

		await waitFor(() => {
			const rows = placements(container)

			expect(rows.length).toBeGreaterThan(0)

			expect(rows.length).toBeLessThan(100)

			for (const row of rows) expect(row.start).toBe(row.offset)
		})
	})

	it('keeps the window on the rows in view after a scroll past measured rows', async () => {
		const { container } = renderUI(<MeasuredList count={500} />)

		await waitFor(() => expect(placements(container).length).toBeGreaterThan(0))

		const scroller = container.querySelector<HTMLElement>('[data-slot="measured-list"]')

		if (!scroller) throw new Error('scroll container not found')

		scroller.scrollTop = 200 * MIXED_ESTIMATE

		scroller.dispatchEvent(new Event('scroll'))

		// The rows the window renders overlap the viewport, and each sits where its start says.
		await waitFor(() => {
			const rows = placements(container)

			const top = scroller.scrollTop

			expect(rows.some((row) => row.offset <= top + 300 && row.offset >= top - 90)).toBe(true)

			for (const row of rows) expect(row.start).toBe(row.offset)
		})
	})

	it('keeps each measured height with its key when a row is prepended above the window', async () => {
		const handle: MeasuredListHandle = { prepend: () => {} }

		const { container } = renderUI(<MeasuredList count={500} handle={handle} />)

		await waitFor(() => expect(placements(container).length).toBeGreaterThan(0))

		const scroller = container.querySelector<HTMLElement>('[data-slot="measured-list"]')

		if (!scroller) throw new Error('scroll container not found')

		// The mount measured the head of the list, so every row above this window has its real height.
		scroller.scrollTop = 300

		scroller.dispatchEvent(new Event('scroll'))

		await waitFor(() => {
			const rows = placements(container)

			expect(rows[0]?.text).not.toBe('Row 0')

			for (const row of rows) expect(row.start).toBe(row.offset)
		})

		// The prepended row never renders, so it keeps the estimate. A height
		// cached against an index would stay on the index and shift one row down.
		act(() => handle.prepend([1000]))

		await waitFor(() => {
			const [first] = placements(container)

			const id = Number(first?.text?.replace('Row ', ''))

			expect(id).not.toBe(1000)

			expect(first?.start).toBe(MIXED_ESTIMATE + realOffset(id))
		})
	})

	it('holds a row in view still while rows above it measure taller on a scroll up', async () => {
		// Every row measures 30, 60 or 90 pixels against an estimate of 30.
		const { container } = renderUI(<MeasuredList count={500} estimate={30} />)

		await waitFor(() => expect(placements(container).length).toBeGreaterThan(0))

		const scroller = container.querySelector<HTMLElement>('[data-slot="measured-list"]')

		if (!scroller) throw new Error('scroll container not found')

		// A jump skips the rows above the new window, so they keep the estimate.
		scroller.scrollTop = 6000

		await waitFor(() => expect(placements(container)[0]?.text).not.toBe('Row 0'))

		await frames()

		let steps = 0

		while (scroller.scrollTop > 400 && steps < 40) {
			const top = scroller.getBoundingClientRect().top

			const anchor = Array.from(
				container.querySelectorAll<HTMLElement>('[data-slot="measured-row"]'),
			).find((row) => row.getBoundingClientRect().top - top > 60)

			if (!anchor) throw new Error('no row in view')

			const before = anchor.getBoundingClientRect().top

			scroller.scrollTop -= 100

			await frames()

			await frames()

			// The anchor moves down by the 100 pixels of the scroll and no more.
			// A row above it that measured taller must not push it further.
			expect(anchor.isConnected).toBe(true)

			expect(Math.abs(anchor.getBoundingClientRect().top - before - 100)).toBeLessThanOrEqual(1)

			steps++
		}

		expect(steps).toBeGreaterThan(10)
	})
})

const CAP = 240

/**
 * Minimal list over `useVirtualWindow` whose scroller has only a `max-height`. It draws no
 * stand-in rows, so the bottom spacer alone gives the scroller its height before the first window.
 */
function CappedList({ estimateSize }: { estimateSize: number | ((index: number) => number) }) {
	const scrollRef = useRef<HTMLDivElement>(null)

	const { virtualItems, topSpacer, bottomSpacer } = useVirtualWindow({
		count: 500,
		getScrollElement: () => scrollRef.current,
		estimateSize,
		overscan: 2,
	})

	return (
		<div ref={scrollRef} data-slot="capped-list" style={{ maxHeight: CAP, overflow: 'auto' }}>
			<div style={{ height: topSpacer }} />
			{virtualItems.map((virtualItem) => (
				<div key={virtualItem.index} data-slot="capped-row" style={{ height: virtualItem.size }}>
					Row {virtualItem.index}
				</div>
			))}
			<div style={{ height: bottomSpacer }} />
		</div>
	)
}

/** A function estimate: rows alternate between 20 and 40 pixels. */
const alternating = (index: number) => (index % 2 === 0 ? 20 : 40)

describe('useVirtualWindow under a max-height cap alone', () => {
	it.each([
		['a number estimate', 30, 500 * 30],
		['a function estimate', alternating, 250 * 20 + 250 * 40],
	])('renders a window and spans every row with %s', async (_, estimateSize, total) => {
		const { container } = renderUI(<CappedList estimateSize={estimateSize} />)

		const scroller = container.querySelector<HTMLElement>('[data-slot="capped-list"]')

		if (!scroller) throw new Error('scroll container not found')

		await waitFor(() => {
			const rows = container.querySelectorAll('[data-slot="capped-row"]').length

			expect(rows).toBeGreaterThan(0)

			expect(rows).toBeLessThan(100)
		})

		// The scroller stops at its cap, and its content holds the height of every row.
		expect(scroller.getBoundingClientRect().height).toBeCloseTo(CAP, 0)

		expect(scroller.scrollHeight).toBe(total)
	})
})

describe('VirtualOptions windowing', () => {
	const items = Array.from({ length: 1_000 }, (_, i) => ({ id: i, label: `Item ${i}` }))

	function Panel() {
		return (
			<div role="listbox" style={{ height: '200px', overflow: 'auto' }}>
				<VirtualOptions items={items} estimateSize={32}>
					{(item) => (
						<div key={item.id} role="option" tabIndex={-1}>
							{item.label}
						</div>
					)}
				</VirtualOptions>
			</div>
		)
	}

	it('renders a bounded window, not all 1000 options', async () => {
		const { container } = renderUI(<Panel />)

		await waitFor(() => {
			const rendered = container.querySelectorAll('[role="option"]').length

			expect(rendered).toBeGreaterThan(0)

			expect(rendered).toBeLessThan(100)
		})
	})

	it('reveals deeper options as the listbox scrolls', async () => {
		const { container } = renderUI(<Panel />)

		await waitFor(() =>
			expect(container.querySelectorAll('[role="option"]').length).toBeGreaterThan(0),
		)

		expect(container.textContent).toContain('Item 0')

		expect(container.textContent).not.toContain('Item 400')

		const listbox = container.querySelector<HTMLElement>('[role="listbox"]')

		if (!listbox) throw new Error('listbox not found')

		listbox.scrollTop = 12_800

		listbox.dispatchEvent(new Event('scroll'))

		await waitFor(() => {
			expect(container.textContent).toContain('Item 400')

			expect(container.textContent).not.toContain('Item 0')
		})
	})
})
