import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MapPlat } from '../../modules/map'
import { emitRegionPaths, probeCanonicalFit } from '../../modules/map/engine/map-geometry/projected'
import { regionPaths } from '../../modules/map/engine/map-geometry/region'
import { renderUI } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

/**
 * A `deferPaint` map must build no region path before its container is measured.
 * It holds an empty frame until the measurement lands and then draws from the
 * measured fit alone, so a canonical pass builds paths nothing ever renders. It
 * is not a corner of the API either: `ChoroplethChart` sets `deferPaint` on every
 * chart it draws.
 *
 * What that saves is now the emit rather than the walk. The walk draws the
 * geography into the buffer the canonical fit is measured from, so every map
 * pays exactly one whatever it draws — which is the other half of this gate,
 * because a second would mean the fold had come apart and the fit was measuring
 * its own bounds again. The emit is what `cachedCanonicalPaths` holds off: the
 * paths are memoised beside the geometry entry rather than on it, so a caller
 * that does not want them simply does not call, and there is no field for a
 * spread or a key walk to force. `regionPaths` is the fallback the built-in
 * projections never take, so it stays at zero on both.
 *
 * The mount benchmarks cannot guard this: they warm the cross-instance caches in
 * uncounted iterations, so the pass is already paid by the time they time
 * anything. Only a call count shows it, which needs a module mock — so this
 * suite sits in `boundary/` beside `map-centroid-deferral`, for the reason that
 * one states.
 */
vi.mock('../../modules/map/engine/map-geometry/projected', async (importActual) => {
	const actual =
		await importActual<typeof import('../../modules/map/engine/map-geometry/projected')>()

	// Wraps the real implementations, so behaviour is unchanged and only the call
	// counts are observable.
	return {
		...actual,
		probeCanonicalFit: vi.fn(actual.probeCanonicalFit),
		emitRegionPaths: vi.fn(actual.emitRegionPaths),
	}
})

vi.mock('../../modules/map/engine/map-geometry/region', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/engine/map-geometry/region')>()

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
		vi.mocked(probeCanonicalFit).mockClear()

		vi.mocked(emitRegionPaths).mockClear()

		vi.mocked(regionPaths).mockClear()
	})

	it('builds no region path on a deferred map that has not been measured', () => {
		renderUI(plat({ deferPaint: true }))

		expect(emitRegionPaths).not.toHaveBeenCalled()

		expect(regionPaths).not.toHaveBeenCalled()
	})

	it('still builds the canonical paths for a map that paints before it is measured', () => {
		// The other half of the same branch, and the reason the pass exists: a
		// plain map draws the canonical fit on its first commit rather than waiting
		// for the container. Without this the deferral above would read as a win
		// that had simply broken the mount paint.
		renderUI(plat())

		expect(emitRegionPaths).toHaveBeenCalledTimes(1)

		// The fallback walk stands for geography the buffer declines, which the
		// default projection and a polygon atlas never are.
		expect(regionPaths).not.toHaveBeenCalled()
	})

	it('walks the geography once whether or not the map paints', () => {
		// The fold's own invariant: the fit is measured from the buffer, so the
		// walk that fills it is the only one either mode runs. A second would mean
		// the fit had gone back to measuring its own bounds.
		renderUI(plat({ deferPaint: true }))

		expect(probeCanonicalFit).toHaveBeenCalledTimes(1)

		vi.mocked(probeCanonicalFit).mockClear()

		renderUI(plat())

		expect(probeCanonicalFit).toHaveBeenCalledTimes(1)
	})
})
