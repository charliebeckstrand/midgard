import { describe, expect, it, vi } from 'vitest'
import { cachedRegionCentroids } from '../../modules/map/engine/map-geometry/cache'
import { fireEvent, getSlot, present, renderUI } from '../helpers'
import { categoricalPlat } from '../helpers/map-plat'

/**
 * The keyboard cursor's stops must stay off the mount and the resize paths.
 * `cachedRegionCentroids` runs a `geoCentroid` pass over every ring in the
 * atlas (a large fraction of the cost of a county mount) and the
 * map's three named mount optimizations exist to keep work of that size off the
 * first commit. So the plat hands the hook a closure, and the hook resolves it
 * on the first navigation key.
 *
 * The mount benchmarks cannot guard this: they warm the cross-instance caches
 * in uncounted iterations and time the steady-state remount, where the pass is
 * already paid. Only a call count shows it, which needs a module mock, so this
 * suite lives in `boundary/`, which runs on forks, rather than in the
 * shared-registry `unit` project (see `test-isolation-boundary`).
 */
vi.mock('../../modules/map/engine/map-geometry/cache', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/engine/map-geometry/cache')>()

	// Wraps the real implementation, so behavior is unchanged and only the call
	// count is observable.
	return { ...actual, cachedRegionCentroids: vi.fn(actual.cachedRegionCentroids) }
})

describe('map centroid deferral', () => {
	it('resolves no centroid on mount, on re-render, or on a resize', () => {
		const { container, rerender } = renderUI(categoricalPlat())

		expect(cachedRegionCentroids).not.toHaveBeenCalled()

		// A re-render at a new frame width replaces the projector, which is the
		// dependency a prebuilt stop list would have re-derived from.
		rerender(categoricalPlat({ width: 360 }))

		expect(cachedRegionCentroids).not.toHaveBeenCalled()

		// A pointer sweep drives the same readout the cursor drives, and must not
		// wake the cursor's own machinery either.
		const region = present(container.querySelector('[data-region-index]'), 'region')

		fireEvent.pointerEnter(region, { clientX: 40, clientY: 20 })

		expect(cachedRegionCentroids).not.toHaveBeenCalled()
	})

	it('resolves them once a reader navigates, and reuses that resolution', () => {
		const { container } = renderUI(categoricalPlat())

		const plot = getSlot(container, 'map-plot')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(cachedRegionCentroids).toHaveBeenCalledTimes(1)

		// Every later step reads the held resolution; only a refit replaces it.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowLeft' })

		expect(cachedRegionCentroids).toHaveBeenCalledTimes(1)
	})
})
