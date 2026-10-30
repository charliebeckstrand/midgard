import { Profiler } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { List, ListItem } from '../../components/list'
import { frames, present, renderUI, waitFor } from '../helpers'

/**
 * The window of a `virtual` List, in a real browser.
 *
 * The list windows its rows over the nearest `[data-scroll-region]`. Each rule
 * here is layout: a row height, a gap, a scroll offset, and the content above
 * the list. jsdom lays nothing out, so its window never holds a row.
 */

const COUNT = 200

/** Rows of three heights, so the window measures rather than trusting its guess. */
const items = Array.from({ length: COUNT }, (_, index) => ({
	id: `row-${index}`,
	label: `Row ${index}. ${'late stops rose '.repeat(1 + (index % 3) * 8)}`,
}))

type Item = (typeof items)[number]

function Rows() {
	return (
		<List items={items} sortable={false} virtual getKey={(item: Item) => item.id}>
			{(item) => <ListItem href={`#${item.id}`}>{item.label}</ListItem>}
		</List>
	)
}

/** A scroll region with content above the list, as a drawer body holds a picker over it. */
function Frame() {
	return (
		<div data-scroll-region style={{ height: 300, width: 360, overflowY: 'auto' }}>
			<div style={{ height: 120 }}>Content above</div>

			<Rows />
		</div>
	)
}

const getRegion = (container: HTMLElement) =>
	present(container.querySelector<HTMLElement>('[data-scroll-region]'), 'the scroll region')

const getRows = (container: HTMLElement) =>
	Array.from(container.querySelectorAll<HTMLElement>('[data-slot="list-item"]'))

/** Renders the frame and waits for its first row. */
async function renderFrame() {
	const { container } = renderUI(<Frame />)

	await waitFor(() => expect(getRows(container).length).toBeGreaterThan(0))

	return { container, region: getRegion(container) }
}

/** Scrolls the region to `top` and waits for the window to follow. */
async function scrollTo(region: HTMLElement, top: number) {
	region.scrollTop = top

	region.dispatchEvent(new Event('scroll'))

	await frames()
}

describe('a virtual list', () => {
	it('renders a window and names each row by its place in the whole list', async () => {
		const { container } = renderUI(<Frame />)

		await waitFor(() => {
			const rows = getRows(container)

			expect(rows.length).toBeGreaterThan(0)

			expect(rows.length).toBeLessThan(40)
		})

		const first = getRows(container)[0]

		expect(first).toHaveAttribute('aria-posinset', '1')

		expect(first).toHaveAttribute('aria-setsize', String(COUNT))
	})

	it('moves the rows in view by exactly the distance scrolled', async () => {
		const { container, region } = await renderFrame()

		// A step shorter than a row, so each row the window adds or drops lands
		// between the two reads. A window that placed its rows without the gap
		// would shift the rows in view by one gap each time.
		const step = 37

		for (let at = 0; at < 60; at++) {
			const box = region.getBoundingClientRect()

			const tracked = getRows(container).find(
				(row) => row.getBoundingClientRect().top >= box.top + step,
			)

			const place = tracked?.getAttribute('aria-posinset')

			const before = tracked?.getBoundingClientRect().top ?? 0

			await scrollTo(region, region.scrollTop + step)

			const after = container
				.querySelector<HTMLElement>(`[data-slot="list-item"][aria-posinset="${place}"]`)
				?.getBoundingClientRect().top

			expect(after).toBeDefined()

			expect(before - (after ?? 0)).toBeCloseTo(step, 0)
		}
	})

	it('shows the last row at the foot of the region at the end', async () => {
		const { container, region } = await renderFrame()

		// The rows measure as they come into view, so the end moves while the
		// region scrolls to it. A reader who keeps scrolling reaches it.
		await waitFor(async () => {
			const before = region.scrollTop

			await scrollTo(region, region.scrollHeight)

			expect(region.scrollTop).toBe(before)
		})

		await waitFor(() => {
			const last = getRows(container).at(-1)

			expect(last).toHaveAttribute('aria-posinset', String(COUNT))

			expect(
				Math.abs(
					(last?.getBoundingClientRect().bottom ?? 0) - region.getBoundingClientRect().bottom,
				),
			).toBeLessThanOrEqual(1)
		})
	})

	it('lets Tab walk past the rows it first rendered', async () => {
		const { container } = await renderFrame()

		const initial = getRows(container).length

		getRows(container)[0]?.querySelector<HTMLElement>('a')?.focus()

		for (let step = 0; step < initial + 5; step++) {
			await userEvent.keyboard('{Tab}')

			await frames()
		}

		const focused = document.activeElement?.closest('[data-slot="list-item"]')

		expect(focused).toHaveAttribute('aria-posinset', String(initial + 6))
	})

	it('measures again when a box above the parent of the list grows', async () => {
		// The parent of the list keeps its size. Only the outer box, an ancestor
		// above the parent, grows, as a drawer body holds a section above it.
		const { container } = renderUI(
			<div data-scroll-region style={{ height: 300, width: 360, overflowY: 'auto' }}>
				<div style={{ display: 'flex', flexDirection: 'column' }}>
					<div data-testid="sibling" style={{ height: 120 }}>
						Content above
					</div>

					<div>
						<h2>Heading</h2>

						<Rows />
					</div>
				</div>
			</div>,
		)

		const region = getRegion(container)

		const sibling = present(
			container.querySelector<HTMLElement>('[data-testid="sibling"]'),
			'the sibling',
		)

		await waitFor(() => expect(getRows(container).length).toBeGreaterThan(0))

		// Walk down the whole list first, so each row measures. Then the height of
		// the list does not change, and a resize of its parent does not measure
		// the list again and hide the defect.
		for (let before = -1; region.scrollTop !== before; ) {
			before = region.scrollTop

			await scrollTo(region, before + 250)
		}

		await scrollTo(region, 0)

		sibling.style.height = '3120px'

		await frames()

		const list = present(container.querySelector<HTMLElement>('[data-slot="list"]'), 'the list')

		const listTop =
			list.getBoundingClientRect().top - region.getBoundingClientRect().top + region.scrollTop

		await scrollTo(region, listTop + 600)

		await waitFor(() => {
			const box = region.getBoundingClientRect()

			const middle = box.top + box.height / 2

			const inView = getRows(container).find((row) => {
				const rect = row.getBoundingClientRect()

				return rect.top <= middle && rect.bottom >= middle
			})

			expect(inView).toBeDefined()
		})
	})

	it('goes from its first rows to its window in one step in a scroller that grows to a cap', async () => {
		// Rows much shorter than the first guess of the window, in a scroller that
		// only a maximum height bounds, as the body of a sheet holds a log of short
		// lines. The first rows do not fill the cap.
		const lines = Array.from({ length: COUNT }, (_, index) => ({ id: `line-${index}` }))

		// The count of drawn rows at each commit, with no repeat.
		const counts: number[] = []

		const record = () => {
			const count = document.querySelectorAll('[data-slot="list-item"]').length

			if (counts.at(-1) !== count) counts.push(count)
		}

		const { container } = renderUI(
			<Profiler id="list" onRender={record}>
				<div data-scroll-region style={{ maxHeight: 900, width: 360, overflowY: 'auto' }}>
					<List items={lines} sortable={false} virtual getKey={(line) => line.id}>
						{(line) => <ListItem>{line.id}</ListItem>}
					</List>
				</div>
			</Profiler>,
		)

		await frames()

		const region = getRegion(container)

		expect(region.clientHeight).toBe(900)

		const last = present(getRows(container).at(-1), 'the last row')

		expect(last.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(
			region.getBoundingClientRect().bottom,
		)

		// The first rows, then the window. A window that measured the scroller
		// before it grew to its cap, or that took the guess for the rows, would
		// move again when the rows measured.
		expect(counts).toHaveLength(2)
	})

	it('renders every row where no scroll region holds it', async () => {
		const { container } = renderUI(
			<div style={{ height: 300, overflowY: 'auto' }}>
				<Rows />
			</div>,
		)

		await waitFor(() => expect(getRows(container)).toHaveLength(COUNT))
	})
})
