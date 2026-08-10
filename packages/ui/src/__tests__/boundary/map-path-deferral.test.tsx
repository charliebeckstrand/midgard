import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MapPlat } from '../../modules/map'
import { regionPaths } from '../../modules/map/engine/map-geometry/region'
import { renderUI } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

/**
 * A `deferPaint` map must project no region at all before its container is
 * measured. It holds an empty frame until the measurement lands and then draws
 * from the measured fit alone, so a canonical pass over the atlas builds paths
 * nothing ever renders — 186.8 ms across 3,108 counties, against a fit of
 * 140.4 ms. It is not a corner of the API either: `ChoroplethChart` sets
 * `deferPaint` on every chart it draws.
 *
 * `cachedCanonicalPaths` holds it: the paths are memoised beside the geometry
 * entry rather than on it, so a caller that does not want the pass simply does
 * not call — there is no field for a spread or a key walk to force.
 *
 * The mount benchmarks cannot guard this: they warm the cross-instance caches in
 * uncounted iterations, so the pass is already paid by the time they time
 * anything. Only a call count shows it, which needs a module mock — so this
 * suite sits in `boundary/` beside `map-centroid-deferral`, for the reason that
 * one states.
 */
vi.mock('../../modules/map/engine/map-geometry/region', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/engine/map-geometry/region')>()

	// Wraps the real implementation, so behaviour is unchanged and only the call
	// count is observable.
	return { ...actual, regionPaths: vi.fn(actual.regionPaths) }
})

type Row = (typeof FIXTURE_ROWS)[number]

/**
 * Deliberately without a `width`: an explicit one measures the frame on the
 * first commit, which is the state after the deferral rather than the one under
 * test. A fresh atlas per call, because the static geometry is memoised on the
 * atlas object and a shared fixture would hand the second case the first's
 * entry — paths and all.
 */
function plat(extra?: Partial<Parameters<typeof MapPlat<Row>>[0]>) {
	const props = {
		'aria-label': 'Zones',
		geography: structuredClone(FIXTURE_GEOJSON),
		data: FIXTURE_ROWS,
		regionKey: 'state',
		categoryKey: 'zone',
		...extra,
	} as Parameters<typeof MapPlat<Row>>[0]

	return <MapPlat {...props} />
}

describe('map canonical path deferral', () => {
	beforeEach(() => {
		vi.mocked(regionPaths).mockClear()
	})

	it('projects no region on a deferred map that has not been measured', () => {
		renderUI(plat({ deferPaint: true }))

		expect(regionPaths).not.toHaveBeenCalled()
	})

	it('still projects canonically for a map that paints before it is measured', () => {
		// The other half of the same branch, and the reason the pass exists: a
		// plain map draws the canonical fit on its first commit rather than waiting
		// for the container. Without this the deferral above would read as a win
		// that had simply broken the mount paint.
		renderUI(plat())

		expect(regionPaths).toHaveBeenCalledTimes(1)
	})
})
