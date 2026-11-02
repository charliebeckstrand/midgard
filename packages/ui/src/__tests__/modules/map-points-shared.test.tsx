import { describe, expect, it, vi } from 'vitest'
import { MapPoints } from '../../modules/map'
import { allBySlot, bySlot, fireEvent, getSlot, liveRegion, renderUI, waitFor } from '../helpers'
import { renderNavigable } from '../helpers/map-navigable'
import { overlayPlat } from '../helpers/map-plat'

/**
 * Two point sets on the fixture frame, 30 degrees over 400px. Each depot stands
 * a fraction of a degree from two stops of the other set, so the three merge
 * into one summary. The far stop stands clear of all of them.
 */
const STOPS = [
	{ at: [5.2, 5] as [number, number], label: 'North stop' },
	{ at: [5.4, 5] as [number, number], label: 'South stop' },
	{ at: [25, 5] as [number, number], label: 'Far stop' },
]

const DEPOTS = [{ at: [5, 5] as [number, number], label: 'Depot', detail: 'Origin' }]

/** Both sets, the stops first, so the stops draw the shared summary. */
function bothSets(props?: {
	onStops?: (id: string, index: number, merged: readonly number[]) => void
	onDepots?: (id: string, index: number, merged: readonly number[]) => void
}) {
	return (
		<>
			<MapPoints id="stops" label="Stops" points={STOPS} onClick={props?.onStops} />

			<MapPoints
				id="depots"
				label="Depots"
				shape="square"
				points={DEPOTS}
				onClick={props?.onDepots}
			/>
		</>
	)
}

describe('two point sets on one place', () => {
	it('draw one shared summary that counts the dots of both, and keep a legend row each', () => {
		const { container } = renderUI(overlayPlat(bothSets()))

		const shared = allBySlot(container, 'map-points-shared')

		expect(shared).toHaveLength(1)

		expect(shared[0]?.textContent).toBe('3')

		// One arc for each set, in the order of the ledger.
		expect(allBySlot(shared[0] as HTMLElement, 'map-points-share')).toHaveLength(2)

		// Neither set draws a dot of its own over the summary: the far stop is the
		// one other dot on the map.
		expect(allBySlot(container, 'map-points-dot')).toHaveLength(1)

		expect(allBySlot(container, 'map-points-hit')).toHaveLength(2)

		expect(allBySlot(container, 'map-legend-item')).toHaveLength(2)
	})

	it('part again when the legend puts one of the sets away', () => {
		const { container } = renderUI(overlayPlat(bothSets()))

		const depots = allBySlot(container, 'map-legend-item').find((item) =>
			item.textContent?.includes('Depots'),
		)

		fireEvent.click(depots as Element)

		expect(allBySlot(container, 'map-points-shared')).toHaveLength(0)

		// The stops summarize on their own, as one set alone does.
		expect(allBySlot(container, 'map-points-cluster')).toHaveLength(1)

		expect(bySlot(container, 'map-points-cluster')?.parentElement?.textContent).toContain('2')
	})

	it('read out every part to the pointer, each as its own set reads it', () => {
		const { container } = renderUI(overlayPlat(bothSets()))

		const hit = bySlot(getSlot(container, 'map-points-shared'), 'map-points-hit')

		fireEvent.pointerEnter(hit as Element, { clientX: 10, clientY: 10 })

		const text = bySlot(container, 'tooltip-content')?.textContent ?? ''

		expect(text).toContain('Stops')

		expect(text).toContain('2')

		expect(text).toContain('Depot')

		expect(text).toContain('Origin')

		// The stops come first, in the order of the ledger.
		expect(text.indexOf('Stops')).toBeLessThan(text.indexOf('Depot'))
	})

	it('pick each part through the pick of its own set', () => {
		const onStops = vi.fn()

		const onDepots = vi.fn()

		const { container } = renderUI(overlayPlat(bothSets({ onStops, onDepots })))

		fireEvent.click(bySlot(getSlot(container, 'map-points-shared'), 'map-points-hit') as Element)

		expect(onStops).toHaveBeenCalledExactlyOnceWith('stops', 0, [0, 1])

		expect(onDepots).toHaveBeenCalledExactlyOnceWith('depots', 0, [0])
	})

	it('give the keyboard one stop that reads and picks every part', async () => {
		const onStops = vi.fn()

		const onDepots = vi.fn()

		const { plot } = renderNavigable(overlayPlat(bothSets({ onStops, onDepots })))

		// Home lands on the first stop: the shared summary, which the stops draw.
		fireEvent.keyDown(plot, { key: 'Home' })

		await waitFor(() => expect(liveRegion()?.textContent).toBe('Stops, 2; Depot, Origin'))

		fireEvent.keyDown(plot, { key: 'Enter' })

		expect(onStops).toHaveBeenCalledExactlyOnceWith('stops', 0, [0, 1])

		expect(onDepots).toHaveBeenCalledExactlyOnceWith('depots', 0, [0])

		// The depots add no stop of their own: End lands on the far stop.
		fireEvent.keyDown(plot, { key: 'End' })

		await waitFor(() => expect(liveRegion()?.textContent).toContain('Far stop'))
	})

	it('give the hidden table the part of each set as a row of that set', () => {
		const { container } = renderUI(overlayPlat(bothSets()))

		const text = [...container.querySelectorAll('table tbody tr')].map(
			(row) => row.textContent ?? '',
		)

		expect(text.some((row) => row.includes('Stops') && row.includes('2'))).toBe(true)

		expect(text.some((row) => row.includes('Depot') && row.includes('Origin'))).toBe(true)

		expect(text.some((row) => row.includes('Far stop'))).toBe(true)
	})

	it('keep the shared summary lit while the pointer is on a dot of either set', () => {
		const { container } = renderUI(overlayPlat(bothSets()))

		const far = bySlot(getSlot(container, 'map-points'), 'map-points-hit')

		fireEvent.pointerEnter(far as Element, { clientX: 10, clientY: 10 })

		const shared = bySlot(container, 'map-points-shared')

		expect(shared).not.toBeNull()

		expect(shared?.getAttribute('class') ?? '').not.toContain('opacity-25')

		// The group of the depots, which hold no dot of their own here, dims.
		expect(allBySlot(container, 'map-points')[1]?.getAttribute('class')).toContain('opacity-25')
	})

	it('halo the shared summary for a pick of the set that does not draw it', () => {
		const { container } = renderUI(
			overlayPlat(bothSets(), { selectedOverlay: { id: 'depots', index: 0 } }),
		)

		const halo = allBySlot(container, 'map-points-selected')

		expect(halo).toHaveLength(1)

		// The halo takes the shape of the summary, a circle, and not the square of
		// the depots.
		expect(halo[0]?.getAttribute('stroke-linecap')).toBe('round')
	})
})

describe('a point set that moves', () => {
	it('groups again with the other sets', () => {
		const ui = (depots: typeof DEPOTS) =>
			overlayPlat(
				<>
					<MapPoints id="stops" label="Stops" points={STOPS} />

					<MapPoints id="depots" label="Depots" points={depots} />
				</>,
			)

		const { container, rerender } = renderUI(ui(DEPOTS))

		expect(allBySlot(container, 'map-points-shared')).toHaveLength(1)

		// The depot moves clear of the stops, and the summary parts.
		rerender(ui([{ ...DEPOTS[0], at: [15, 5] } as (typeof DEPOTS)[number]]))

		expect(allBySlot(container, 'map-points-shared')).toHaveLength(0)

		expect(allBySlot(container, 'map-points-cluster')).toHaveLength(1)

		// The depot moves back onto the stops, and they share a summary again.
		rerender(ui(DEPOTS))

		expect(allBySlot(container, 'map-points-shared')).toHaveLength(1)
	})
})

describe('two point sets apart', () => {
	it('draw their own dots and share nothing', () => {
		const { container } = renderUI(
			overlayPlat(
				<>
					<MapPoints id="stops" label="Stops" points={[{ at: [5, 5] }]} />

					<MapPoints id="depots" label="Depots" points={[{ at: [25, 5] }]} />
				</>,
			),
		)

		expect(allBySlot(container, 'map-points-shared')).toHaveLength(0)

		expect(allBySlot(container, 'map-points-dot')).toHaveLength(2)
	})

	it('leave out a set with its grouping off', () => {
		const { container } = renderUI(
			overlayPlat(
				<>
					<MapPoints id="stops" label="Stops" points={STOPS} />

					<MapPoints id="depots" label="Depots" points={DEPOTS} cluster={false} />
				</>,
			),
		)

		expect(allBySlot(container, 'map-points-shared')).toHaveLength(0)

		// The depot draws as the caller asked, over the summary of the stops.
		expect(allBySlot(container, 'map-points-cluster')).toHaveLength(1)

		expect(allBySlot(container, 'map-points-dot')).toHaveLength(2)
	})
})
