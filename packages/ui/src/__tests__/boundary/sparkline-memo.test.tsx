import { describe, expect, it, vi } from 'vitest'
import { Sparkline } from '../../components/sparkline'
import { sparklineGeometry } from '../../components/sparkline/sparkline-geometry'
import { renderUI } from '../helpers'

// The projection is memoized in the component body, so a Grid render does not
// re-project every visible row. The output is identical either way, so the call
// count is the only seam that shows the memo holds. These cases pin both halves:
// the memo holds on a steady series, and it releases when a dependency moves.
//
// The suite holds a per-file module mock, so it lives here and runs on a fork
// (`test-isolation-boundary.test.ts`).
vi.mock('../../components/sparkline/sparkline-geometry', async () => {
	const actual = await vi.importActual<
		typeof import('../../components/sparkline/sparkline-geometry')
	>('../../components/sparkline/sparkline-geometry')

	return { ...actual, sparklineGeometry: vi.fn(actual.sparklineGeometry) }
})

/** The spy wrapping the real projection, cleared for each case. */
function projection() {
	const spy = vi.mocked(sparklineGeometry)

	spy.mockClear()

	return spy
}

describe('Sparkline geometry memo', () => {
	it('reuses the projection when the series and the box hold', () => {
		const spy = projection()

		const data = [1, 4, 2, 8]

		const { rerender } = renderUI(<Sparkline data={data} aria-label="Trend" />)

		expect(spy).toHaveBeenCalledTimes(1)

		// The same array reference and the same box, so the memo holds.
		rerender(<Sparkline data={data} aria-label="Trend" />)

		expect(spy).toHaveBeenCalledTimes(1)
	})

	it('re-projects when the series changes', () => {
		const spy = projection()

		const { rerender } = renderUI(<Sparkline data={[1, 4, 2, 8]} aria-label="Trend" />)

		rerender(<Sparkline data={[1, 4, 2, 8, 5]} aria-label="Trend" />)

		expect(spy).toHaveBeenCalledTimes(2)
	})

	it('re-projects when the drawing box changes', () => {
		const spy = projection()

		const data = [1, 4, 2, 8]

		const { rerender } = renderUI(<Sparkline data={data} width={96} aria-label="Trend" />)

		// The series holds, so a stale memo would keep the old width's geometry.
		rerender(<Sparkline data={data} width={120} aria-label="Trend" />)

		expect(spy).toHaveBeenCalledTimes(2)
	})
})
