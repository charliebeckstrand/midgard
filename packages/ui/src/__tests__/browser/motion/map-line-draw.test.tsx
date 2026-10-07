import { describe, expect, it } from 'vitest'
import { MapLine } from '../../../modules/map/map-line'
import { ReducedMotion } from '../../../primitives/reduced-motion'
import { bySlot, present, renderUI, waitFor } from '../../helpers'
import { nextPaint } from '../../helpers/frames'

/** A draw held behind a delay, as a marker's leg waits for its start pin. */
const HELD = { duration: 0.2, delay: 0.15 }

/** The drawn share of the line: the dash length that motion writes for `pathLength`. */
function drawn(line: SVGPathElement): number {
	const dash = line.getAttribute('stroke-dasharray')

	if (dash === null) throw new Error('expected motion to write the dash of the draw')

	return Number.parseFloat(dash)
}

/** The opacity that the browser paints the line at. */
function opacity(line: SVGPathElement): number {
	return Number.parseFloat(getComputedStyle(line).opacity)
}

/**
 * Real-Motion check of the line draw. The other suites mock `motion/react`,
 * and the mock writes no dash.
 *
 * Motion draws a line by its dash. It sets `pathLength` to 1 and writes the
 * dash array as `<drawn> 1`. At zero, the pattern repeats exactly at the end of
 * the path. A zero-length dash under a round cap paints a dot, so the line
 * paints a dot at each end before its draw starts. A marker's leg waits for its
 * start pin, so the dot at the far end showed the destination before the line
 * got to it.
 */
describe('MapLine draw (real Motion)', () => {
	it('paints nothing while the draw holds at zero length, and the whole line after', async () => {
		const { container } = renderUI(
			// The animated marks of a map render under its `ReducedMotion` root.
			<ReducedMotion>
				<svg aria-hidden="true" width={200} height={20} viewBox="0 0 200 20">
					<MapLine
						slot="map-line"
						d="M10,10L190,10"
						scale={1}
						className="stroke-current"
						animate
						transition={HELD}
					/>
				</svg>
			</ReducedMotion>,
		)

		const line = present<SVGPathElement>(bySlot(container, 'map-line'), 'map-line')

		// Each frame through the delay, up to the first frame of the draw. A frame
		// that paints the line at zero length is the dot.
		const painted: number[] = []

		while (drawn(line) === 0) {
			painted.push(opacity(line))

			await nextPaint()
		}

		expect(painted.length).toBeGreaterThan(0)

		expect(painted.filter((value) => value > 0)).toEqual([])

		await waitFor(() => expect(drawn(line)).toBe(1))

		expect(opacity(line)).toBe(1)
	})
})
