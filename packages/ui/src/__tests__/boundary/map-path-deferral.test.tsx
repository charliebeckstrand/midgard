import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emitRegionPaths, probeCanonicalFit } from '../../modules/map/engine/map-geometry/projected'
import { regionPaths } from '../../modules/map/engine/map-geometry/region'
import { renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'
import { categoricalPlat } from '../helpers/map-plat'

/**
 * Every map builds the canonical region paths one time before its container is
 * measured, whatever its sizing. The server cannot measure a box, so the
 * canonical frame is the frame that it draws. After the measurement, the region
 * layer carries the same paths onto the measured fit on one transform, so the
 * named projections never emit a second set.
 *
 * Every map also walks its geography one time, because the canonical fit is
 * measured from that walk. A second walk would mean the fold had come apart and
 * the fit was measuring its own bounds again. `regionPaths` is the fallback the
 * built-in projections never take, so it stays at zero.
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

	// Wraps the real implementations, so behavior is unchanged and only the call
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

/**
 * Deliberately without a `width`: an explicit one measures the frame on the
 * first commit, which is the state after the measurement rather than the one
 * under test. A fresh atlas per call, because the static geometry is memoized on the
 * atlas object and a shared fixture would hand the second case the first's
 * entry — paths and all.
 */
function plat(extra?: Parameters<typeof categoricalPlat>[0]) {
	return categoricalPlat({
		geography: structuredClone(FIXTURE_GEOJSON),
		width: undefined,
		...extra,
	})
}

describe('map canonical paths', () => {
	beforeEach(() => {
		vi.mocked(probeCanonicalFit).mockClear()

		vi.mocked(emitRegionPaths).mockClear()

		vi.mocked(regionPaths).mockClear()
	})

	it.each([
		['the auto aspect', undefined],
		['a fixed aspect', '16/9'],
		['the fill frame', false],
	] as const)('builds the canonical paths one time under %s', (_, aspectRatio) => {
		renderUI(plat(aspectRatio === undefined ? undefined : { aspectRatio }))

		expect(emitRegionPaths).toHaveBeenCalledTimes(1)

		// The fallback walk stands for geography the buffer declines, which the
		// default projection and a polygon atlas never are.
		expect(regionPaths).not.toHaveBeenCalled()
	})

	it('walks the geography once whatever the sizing', () => {
		// The fold's own invariant: the fit is measured from the buffer, so the
		// walk that fills it is the only one either mode runs. A second would mean
		// the fit had gone back to measuring its own bounds.
		renderUI(plat({ aspectRatio: '16/9' }))

		expect(probeCanonicalFit).toHaveBeenCalledTimes(1)

		vi.mocked(probeCanonicalFit).mockClear()

		renderUI(plat())

		expect(probeCanonicalFit).toHaveBeenCalledTimes(1)
	})
})
