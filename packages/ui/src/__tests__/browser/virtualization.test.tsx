import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { useVirtualWindow } from '../../hooks'
import { type ChatContent, ChatTranscript } from '../../modules/chat'
import { VirtualOptions } from '../../primitives/virtual-options'
import { renderUI, waitFor } from '../helpers'

/**
 * Virtualization windowing (real browser). With a real layout engine the
 * virtualizer measures an actual viewport; asserts that a windowed subset
 * renders and that the window tracks scroll position, behaviour jsdom can't
 * exercise (zero-size scroll container → zero rendered rows).
 *
 * Coverage spans the three production windowing seams: `useVirtualWindow` (the
 * hook Grid's virtualized body delegates to, exercised in a minimal real
 * table), `VirtualOptions` (the primitive that windows Combobox/Listbox
 * options), and `ChatTranscript` (the chat module's windowed transcript, with
 * per-row dynamic measurement and pinned-to-newest scrolling). All require a
 * viewport of definite height; the harnesses supply a fixed height rather
 * than relying on `max-height`.
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

describe('ChatTranscript windowing', () => {
	const messages: ChatContent[] = Array.from({ length: 300 }, (_, i) => ({
		id: String(i),
		role: i % 2 === 0 ? ('user' as const) : ('agent' as const),
		content: `Message ${i}`,
	}))

	function Harness() {
		return (
			<div style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
				<ChatTranscript messages={messages} virtualize />
			</div>
		)
	}

	function bubbles(root: ParentNode) {
		return root.querySelectorAll('[data-slot="chat-message"]')
	}

	it('renders a bounded, measured window and opens pinned to the newest messages', async () => {
		const { container } = renderUI(<Harness />)

		await waitFor(() => {
			const rendered = bubbles(container).length

			expect(rendered).toBeGreaterThan(0)

			expect(rendered).toBeLessThan(150)
		})

		// The mount-time jump lands the window at the transcript's tail, not its head.
		await waitFor(() => {
			expect(container.textContent).toContain('Message 299')

			expect(container.textContent).not.toContain('Message 0')
		})
	})

	it('mounts earlier messages as the transcript scrolls back up', async () => {
		const { container } = renderUI(<Harness />)

		// Let the mount-settle pin land on the tail before scrolling away from it.
		await waitFor(() => expect(container.textContent).toContain('Message 299'))

		const transcript = container.querySelector<HTMLElement>('[data-slot="chat-transcript"]')

		if (!transcript) throw new Error('transcript not found')

		transcript.scrollTop = 0

		transcript.dispatchEvent(new Event('scroll'))

		await waitFor(() => {
			expect(container.textContent).toContain('Message 0')

			expect(container.textContent).not.toContain('Message 299')
		})
	})
})
