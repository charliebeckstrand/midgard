import { describe, expect, it, vi } from 'vitest'
import { MapPlat } from '../../modules/map'
import { MAP_PRELOAD_DWELL_MS } from '../../modules/map/engine/map-constants'
import { allRegions, bySlot, fireEvent, renderUI, withFakeTime } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

type Row = (typeof FIXTURE_ROWS)[number]

function plat(extra?: Partial<Parameters<typeof MapPlat<Row>>[0]>) {
	const props = {
		'aria-label': 'Zones',
		geography: FIXTURE_GEOJSON,
		data: FIXTURE_ROWS,
		regionKey: 'state',
		categoryKey: 'zone',
		width: 400,
		...extra,
	} as Parameters<typeof MapPlat<Row>>[0]

	return <MapPlat {...props} />
}

/** Points at a region, at coordinates the readout would anchor to. */
function point(region: Element) {
	fireEvent.pointerEnter(region, { clientX: 40, clientY: 20 })
}

/** Takes the pointer off the region layer, the way leaving the map does. */
function leave(container: HTMLElement) {
	fireEvent.pointerLeave(bySlot(container, 'map-regions') as Element)
}

/**
 * Renders the plat and gives the plot's SVG a real box, the way the keyboard
 * suite does: jsdom reports every rect as zero, and the cursor anchors its
 * readout by converting a frame centroid through that box — so without one it
 * resolves no position, writes no hover target, and warms nothing for the wrong
 * reason.
 */
function renderNavigable(extra?: Partial<Parameters<typeof MapPlat<Row>>[0]>) {
	const view = renderUI(plat(extra))

	const svg = view.container.querySelector('svg')

	if (svg === null) throw new Error('the plat drew no SVG to navigate')

	vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
		left: 0,
		top: 0,
		width: 400,
		height: 200,
		right: 400,
		bottom: 200,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	})

	const plot = bySlot(view.container, 'map-plot')

	if (plot === null) throw new Error('the plat drew no plot region')

	return { ...view, plot }
}

describe('MapPlat onRegionPreload', () => {
	it('warms the region the pointer holds, by the identity a click reports', async () => {
		await withFakeTime(async (clock) => {
			const preload = vi.fn()

			const { container } = renderUI(plat({ onRegionPreload: preload }))

			const [, beta] = allRegions(container)

			point(beta as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			// The pair `onRegionClick` reports: the `regionId` identity the caller's
			// own rows join on, then the feature index.
			expect(preload).toHaveBeenCalledExactlyOnceWith('B', 1)
		})
	})

	it('warms nothing until the region is held through the dwell', async () => {
		await withFakeTime(async (clock) => {
			const preload = vi.fn()

			const { container } = renderUI(plat({ onRegionPreload: preload }))

			const [alpha] = allRegions(container)

			point(alpha as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS - 1)

			expect(preload).not.toHaveBeenCalled()

			await clock.advance(1)

			expect(preload).toHaveBeenCalledExactlyOnceWith('A', 0)
		})
	})

	it('warms nothing for a region the pointer only passes through', async () => {
		await withFakeTime(async (clock) => {
			const preload = vi.fn()

			const { container } = renderUI(plat({ onRegionPreload: preload }))

			const [alpha, beta, gamma] = allRegions(container)

			// The travel a pointer makes reaching the far side of a map: every region
			// on the way is crossed, and none of them is the one the reader wants.
			point(alpha as Element)

			point(beta as Element)

			point(gamma as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			// Only where it came to rest.
			expect(preload).toHaveBeenCalledExactlyOnceWith('C', 2)
		})
	})

	it('warms nothing when the pointer leaves the map inside the dwell', async () => {
		await withFakeTime(async (clock) => {
			const preload = vi.fn()

			const { container } = renderUI(plat({ onRegionPreload: preload }))

			const [alpha] = allRegions(container)

			point(alpha as Element)

			leave(container)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			expect(preload).not.toHaveBeenCalled()
		})
	})

	it('warms a region once, however often the pointer crosses back over it', async () => {
		await withFakeTime(async (clock) => {
			const preload = vi.fn()

			const { container } = renderUI(plat({ onRegionPreload: preload }))

			const [alpha, beta] = allRegions(container)

			point(alpha as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			point(beta as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			point(alpha as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			expect(preload.mock.calls).toEqual([
				['A', 0],
				['B', 1],
			])
		})
	})

	it('holds the latch across a re-render that churns the handler identity', async () => {
		await withFakeTime(async (clock) => {
			const preload = vi.fn()

			// The inline arrow a consumer writes: a fresh identity on every render,
			// which must not re-arm a region the reader already warmed.
			const { container, rerender } = renderUI(
				plat({ onRegionPreload: (id, index) => preload(id, index) }),
			)

			const [alpha] = allRegions(container)

			point(alpha as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			leave(container)

			rerender(plat({ onRegionPreload: (id, index) => preload(id, index) }))

			point(allRegions(container)[0] as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			expect(preload).toHaveBeenCalledOnce()
		})
	})

	it('re-arms every region when the geography changes', async () => {
		await withFakeTime(async (clock) => {
			const preload = vi.fn()

			const { container, rerender } = renderUI(plat({ onRegionPreload: preload }))

			point(allRegions(container)[0] as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			leave(container)

			// A feature index means nothing against features it did not come from, so
			// the latch belongs to the geography and goes with it.
			rerender(
				plat({
					onRegionPreload: preload,
					geography: { ...FIXTURE_GEOJSON, features: [...FIXTURE_GEOJSON.features] },
				}),
			)

			point(allRegions(container)[0] as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			expect(preload.mock.calls).toEqual([
				['A', 0],
				['A', 0],
			])
		})
	})

	it('warms a region carrying no data', async () => {
		await withFakeTime(async (clock) => {
			const preload = vi.fn()

			const { container } = renderUI(plat({ onRegionPreload: preload }))

			// Gamma matches no row, so it takes no pointed emphasis. What it opens
			// into is a different question, and it still answers this one.
			const [, , gamma] = allRegions(container)

			point(gamma as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			expect(bySlot(container, 'map-regions-lit')).toBeNull()

			expect(preload).toHaveBeenCalledExactlyOnceWith('C', 2)
		})
	})

	it('warms on a plain navigation map, which has no readout to track by', async () => {
		await withFakeTime(async (clock) => {
			const preload = vi.fn()

			// A geography and the prop, no `data` at all: without warming lifting the
			// layer's tracking with it, the pointer half of the report would be dead.
			const { container } = renderUI(
				<MapPlat
					aria-label="States"
					geography={FIXTURE_GEOJSON}
					width={400}
					onRegionPreload={preload}
				/>,
			)

			point(allRegions(container)[1] as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			expect(preload).toHaveBeenCalledExactlyOnceWith('B', 1)
		})
	})

	it('warms from the keyboard cursor, so both inputs signal the same intent', async () => {
		await withFakeTime(async (clock) => {
			const preload = vi.fn()

			const { plot } = renderNavigable({ onRegionPreload: preload })

			// The arrow keys move the same hover target a pointer does, so the reader
			// who navigates by keyboard warms what the pointing one warms.
			fireEvent.keyDown(plot, { key: 'ArrowRight' })

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			expect(preload).toHaveBeenCalledExactlyOnceWith('A', 0)
		})
	})

	it('arms no dwell on a plat that asked for no warming', async () => {
		await withFakeTime(async (clock) => {
			const timer = vi.spyOn(globalThis, 'setTimeout')

			const { container } = renderUI(plat())

			timer.mockClear()

			point(allRegions(container)[0] as Element)

			await clock.advance(MAP_PRELOAD_DWELL_MS)

			expect(timer).not.toHaveBeenCalled()

			timer.mockRestore()
		})
	})
})
