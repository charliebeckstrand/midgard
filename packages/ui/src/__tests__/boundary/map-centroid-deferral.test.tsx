import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MapPlat } from '../../modules/map'
import { cachedRegionCentroids } from '../../modules/map/engine/map-geometry/cache'
import { bySlot, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

/**
 * The keyboard cursor's stops must stay off the mount and the resize paths.
 * `cachedRegionCentroids` runs a `geoCentroid` pass over every ring in the
 * atlas — ~30 ms across 3,000 counties, against a ~70 ms county mount — and the
 * map's three named mount optimisations exist to keep work of that size off the
 * first commit. So the plat hands the hook a closure, and the hook resolves it
 * on the first navigation key.
 *
 * The mount benchmarks cannot guard this: they warm the cross-instance caches
 * in uncounted iterations and time the steady-state remount, where the pass is
 * already paid. Only a call count shows it, which needs a module mock — so this
 * suite lives in `boundary/`, which runs on forks, rather than in the
 * shared-registry `unit` project (see `test-isolation-boundary`).
 */
vi.mock('../../modules/map/engine/map-geometry/cache', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/engine/map-geometry/cache')>()

	// Wraps the real implementation, so behaviour is unchanged and only the call
	// count is observable.
	return { ...actual, cachedRegionCentroids: vi.fn(actual.cachedRegionCentroids) }
})

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

describe('map centroid deferral', () => {
	// A block body, not a concise one: `mockClear()` returns the mock, and a
	// function returned from `beforeEach` is a teardown hook — vitest would call
	// the mock itself, with no arguments, after every test.
	beforeEach(() => {
		vi.mocked(cachedRegionCentroids).mockClear()
	})

	it('resolves no centroid on mount, on re-render, or on a resize', () => {
		const { container, rerender } = renderUI(plat())

		expect(cachedRegionCentroids).not.toHaveBeenCalled()

		// A re-render at a new frame width replaces the projector, which is the
		// dependency a prebuilt stop list would have re-derived from.
		rerender(plat({ width: 360 }))

		expect(cachedRegionCentroids).not.toHaveBeenCalled()

		// A pointer sweep drives the same readout the cursor drives, and must not
		// wake the cursor's own machinery either.
		const region = container.querySelector('[data-region-index]')

		fireEvent.pointerEnter(region as Element, { clientX: 40, clientY: 20 })

		expect(cachedRegionCentroids).not.toHaveBeenCalled()
	})

	it('resolves them once a reader navigates, and reuses that resolution', () => {
		const { container } = renderUI(plat())

		const plot = bySlot(container, 'map-plot')

		fireEvent.keyDown(plot as Element, { key: 'ArrowRight' })

		expect(cachedRegionCentroids).toHaveBeenCalledTimes(1)

		// Every later step reads the held resolution; only a refit replaces it.
		fireEvent.keyDown(plot as Element, { key: 'ArrowRight' })

		fireEvent.keyDown(plot as Element, { key: 'ArrowLeft' })

		expect(cachedRegionCentroids).toHaveBeenCalledTimes(1)
	})
})
