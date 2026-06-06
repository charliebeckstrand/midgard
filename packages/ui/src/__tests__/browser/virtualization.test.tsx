import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { useVirtualWindow } from '../../hooks'
import { VirtualOptions } from '../../primitives/virtual-options'
import { renderUI, waitFor } from '../helpers'

/**
 * Virtualization windowing (real browser). Under jsdom react-virtual sees a
 * zero-size scroll container and renders zero rows, so the jsdom suites
 * (data-table.test.tsx, virtual-options.test.tsx) can only assert the
 * deterministic seams — full row count, boundedness — and defer real windowing
 * to the benchmarks. With a real layout engine the virtualizer measures an
 * actual viewport, so here we assert the behaviour those suites couldn't: a
 * windowed subset renders, and that window tracks the scroll position.
 *
 * Coverage runs through the two production windowing seams: `useVirtualWindow`
 * (the hook DataTable's virtualized body delegates to — exercised in a real
 * table here) and `VirtualOptions` (the primitive that windows Combobox/Listbox
 * options). Both need a viewport of definite height: an empty virtualized list
 * is circular — no rows means no spacer means no height means no rows — so a
 * bare `max-height` container collapses. Production mounts these in a sized
 * parent; the harnesses give them a fixed height.
 *
 * The full DataTable *component* is intentionally not driven here: its render
 * lifecycle never initialises the virtualizer on an isolated headless mount
 * (rows stay empty regardless of viewport), the flaky third-party-lifecycle case
 * CONVENTIONS §10.3 says not to drive. Its windowing is covered by the
 * benchmarks; the shared hook below is the real logic it delegates to.
 */

const TABLE_HEIGHT = 300
const ROW_HEIGHT = 44

/** Minimal real table over `useVirtualWindow`, mirroring DataTable's virtualized body. */
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

		// Real measurement: a 300px viewport over 44px rows windows to ~17 rows,
		// not all 500 — the assertion jsdom's zero viewport can't make.
		await waitFor(() => {
			const count = dataRows(container).length

			expect(count).toBeGreaterThan(0)
			expect(count).toBeLessThan(100)
		})
	})

	it('advances the window as the container scrolls', async () => {
		const { container } = renderUI(<VirtualTable count={500} />)

		await waitFor(() => expect(dataRows(container).length).toBeGreaterThan(0))

		// The first page shows the head of the list and not a deep row.
		expect(container.textContent).toContain('Row 0')
		expect(container.textContent).not.toContain('Row 200')

		const scroller = container.querySelector<HTMLElement>('[data-slot="virtual-table"]')

		if (!scroller) throw new Error('scroll container not found')

		scroller.scrollTop = 200 * ROW_HEIGHT
		scroller.dispatchEvent(new Event('scroll'))

		// After scrolling, the window has moved off the head onto deeper rows.
		await waitFor(() => {
			expect(container.textContent).toContain('Row 200')
			expect(container.textContent).not.toContain('Row 0')
		})
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
