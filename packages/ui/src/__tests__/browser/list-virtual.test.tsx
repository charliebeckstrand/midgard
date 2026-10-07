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

function Rows({ virtual }: { virtual: boolean }) {
	return (
		<List items={items} virtual={virtual} getKey={(item: Item) => item.id}>
			{(item) => <ListItem href={`#${item.id}`}>{item.label}</ListItem>}
		</List>
	)
}

/** A scroll region with content above the list, as a drawer body holds a picker over it. */
function Frame() {
	return (
		<div data-scroll-region style={{ height: 300, width: 360, overflowY: 'auto' }}>
			<div style={{ height: 120 }}>Content above</div>

			<Rows virtual />
		</div>
	)
}

const regionOf = (container: HTMLElement) =>
	present(container.querySelector<HTMLElement>('[data-scroll-region]'), 'the scroll region')

const rowsOf = (container: HTMLElement) =>
	Array.from(container.querySelectorAll<HTMLElement>('[data-slot="list-item"]'))

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
			const rows = rowsOf(container)

			expect(rows.length).toBeGreaterThan(0)

			expect(rows.length).toBeLessThan(40)
		})

		const first = rowsOf(container)[0]

		expect(first).toHaveAttribute('aria-posinset', '1')

		expect(first).toHaveAttribute('aria-setsize', String(COUNT))
	})

	it('moves the rows in view by exactly the distance scrolled', async () => {
		const { container } = renderUI(<Frame />)

		const region = regionOf(container)

		await waitFor(() => expect(rowsOf(container).length).toBeGreaterThan(0))

		// A step shorter than a row, so each row the window adds or drops lands
		// between the two reads. A window that placed its rows without the gap
		// would shift the rows in view by one gap each time.
		const step = 37

		for (let at = 0; at < 60; at++) {
			const box = region.getBoundingClientRect()

			const tracked = rowsOf(container).find(
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
		const { container } = renderUI(<Frame />)

		const region = regionOf(container)

		await waitFor(() => expect(rowsOf(container).length).toBeGreaterThan(0))

		// The rows measure as they come into view, so the end moves while the
		// region scrolls to it. A reader who keeps scrolling reaches it.
		await waitFor(async () => {
			const before = region.scrollTop

			await scrollTo(region, region.scrollHeight)

			expect(region.scrollTop).toBe(before)
		})

		await waitFor(() => {
			const last = rowsOf(container).at(-1)

			expect(last).toHaveAttribute('aria-posinset', String(COUNT))

			expect(
				Math.abs(
					(last?.getBoundingClientRect().bottom ?? 0) - region.getBoundingClientRect().bottom,
				),
			).toBeLessThanOrEqual(1)
		})
	})

	it('lets Tab walk past the rows it first rendered', async () => {
		const { container } = renderUI(<Frame />)

		await waitFor(() => expect(rowsOf(container).length).toBeGreaterThan(0))

		const initial = rowsOf(container).length

		rowsOf(container)[0]?.querySelector<HTMLElement>('a')?.focus()

		for (let step = 0; step < initial + 5; step++) {
			await userEvent.keyboard('{Tab}')

			await frames()
		}

		const focused = document.activeElement?.closest('[data-slot="list-item"]')

		expect(focused).toHaveAttribute('aria-posinset', String(initial + 6))
	})

	it('renders every row where no scroll region holds it', async () => {
		const { container } = renderUI(
			<div style={{ height: 300, overflowY: 'auto' }}>
				<Rows virtual />
			</div>,
		)

		await waitFor(() => expect(rowsOf(container)).toHaveLength(COUNT))
	})
})
