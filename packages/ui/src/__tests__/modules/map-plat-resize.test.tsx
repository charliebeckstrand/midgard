import { geoMercator } from 'd3-geo'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MapPlat } from '../../modules/map'
import { act, allBySlot, bySlot, mockDomGeometry, renderUI } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

/**
 * A passed d3 projection instance is fit in place, so it keeps its reference
 * across resizes. The plat resolves the measured fit, its region paths, and the
 * projector as one unit over the live frame dimensions, so a resize reprojects
 * all three rather than freezing the geometry at the first fit while the viewBox
 * moves on — the regression these lock.
 */

type StubInstance = {
	callback: ResizeObserverCallback
}

/** Captures constructed `ResizeObserver`s so a test can fire their callbacks. */
function installResizeObserverStub() {
	const original = window.ResizeObserver

	const instances: StubInstance[] = []

	class Stub {
		observe = vi.fn()
		unobserve = vi.fn()
		disconnect = vi.fn()

		callback: ResizeObserverCallback

		constructor(cb: ResizeObserverCallback) {
			this.callback = cb

			instances.push(this)
		}
	}

	window.ResizeObserver = Stub as unknown as typeof ResizeObserver

	return {
		instances,
		restore: () => {
			window.ResizeObserver = original
		},
	}
}

describe('MapPlat resize with a passed projection instance', () => {
	let stub: ReturnType<typeof installResizeObserverStub>

	beforeEach(() => {
		stub = installResizeObserverStub()
	})

	afterEach(() => {
		stub.restore()
	})

	/** Reports a container size to the plat through its captured observer. */
	function resizeTo(container: HTMLElement, width: number, height: number) {
		const plot = bySlot(container, 'map-plot')

		if (!plot) throw new Error('no map-plot region rendered')

		mockDomGeometry(plot, { clientWidth: width, clientHeight: height })

		act(() => {
			for (const observer of stub.instances) {
				observer.callback([], observer as unknown as ResizeObserver)
			}
		})
	}

	/** The first region's path `d`, or `null` before any region is drawn. */
	function firstRegionPath(container: HTMLElement): string | null {
		return allBySlot(container, 'map-region')[0]?.getAttribute('d') ?? null
	}

	/** The width component of the plot SVG's `viewBox`. */
	function viewBoxWidth(container: HTMLElement): string | undefined {
		return bySlot(container, 'map-plot')
			?.querySelector('svg')
			?.getAttribute('viewBox')
			?.split(' ')[2]
	}

	it('reprojects region geometry on every resize, not just the first', () => {
		const { container } = renderUI(
			<MapPlat
				aria-label="Zones"
				geography={FIXTURE_GEOJSON}
				data={FIXTURE_ROWS}
				regionKey="state"
				categoryKey="zone"
				projection={geoMercator()}
			/>,
		)

		resizeTo(container, 300, 100)

		const atFirst = firstRegionPath(container)

		expect(atFirst).toBeTruthy()

		expect(viewBoxWidth(container)).toBe('300')

		resizeTo(container, 600, 200)

		const atSecond = firstRegionPath(container)

		// The viewBox doubled; the region geometry must follow it. A frozen path
		// memo would hold `d` at the 300-wide fit while the viewBox reads 600.
		expect(viewBoxWidth(container)).toBe('600')

		expect(atSecond).not.toBe(atFirst)
	})
})

describe('MapPlat free-form fill sizing (aspectRatio={false})', () => {
	let stub: ReturnType<typeof installResizeObserverStub>

	beforeEach(() => {
		stub = installResizeObserverStub()
	})

	afterEach(() => {
		stub.restore()
	})

	/** Reports a container size to the plat through its captured observer. */
	function resizeTo(container: HTMLElement, width: number, height: number) {
		const plot = bySlot(container, 'map-plot')

		if (!plot) throw new Error('no map-plot region rendered')

		mockDomGeometry(plot, { clientWidth: width, clientHeight: height })

		act(() => {
			for (const observer of stub.instances) {
				observer.callback([], observer as unknown as ResizeObserver)
			}
		})
	}

	it('fills its container height instead of collapsing to a reserved zero', () => {
		const { container } = renderUI(
			<MapPlat aria-label="Fill" geography={FIXTURE_GEOJSON} aspectRatio={false} />,
		)

		// The frame grabs the container's height and the plot region grows into it,
		// so the box measures a real height rather than the zero its own reserve
		// would feed back. Without the mechanism the plot has no `flex-1`/`min-h-0`
		// and the box reserves a self-measured zero.
		expect(bySlot(container, 'map')?.className).toContain('h-full')

		const plot = bySlot(container, 'map-plot')

		expect(plot?.className).toContain('flex-1')

		expect(plot?.className).toContain('min-h-0')

		// The plot box fills the region rather than reserving a height from its width.
		expect((plot?.firstElementChild as HTMLElement).className).toContain('size-full')

		// With a real container height reported, the geography draws to it — a
		// reserved-zero box would measure 0 and suppress the SVG.
		resizeTo(container, 480, 300)

		expect(bySlot(container, 'map-plot')?.querySelector('svg')?.getAttribute('viewBox')).toBe(
			'0 0 480 300',
		)
	})
})
