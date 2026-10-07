import { Profiler, type ProfilerOnRenderCallback } from 'react'
import { describe, expect, it } from 'vitest'
import { MapDot } from '../../../modules/map/map-dot'
import { ReducedMotion } from '../../../primitives/reduced-motion'
import { renderUI, waitFor } from '../../helpers'
import { frames } from '../../helpers/frames'
import { sampleMotionFrames } from '../helpers/motion-frame'

/** A short pop. */
const POP = { duration: 0.05 }

/** The stagger delays of a set of dots. */
const DELAYS = [0, 0.01, 0.02, 0.03, 0.04]

function dot(scale: number, delay = 0) {
	return (
		<MapDot
			slot="map-points-dot"
			at={{ x: 10, y: 10 }}
			radius={4}
			scale={scale}
			className="stroke-current"
			animate
			transition={{ ...POP, delay }}
		/>
	)
}

function dots(container: HTMLElement) {
	return [...container.querySelectorAll<SVGPathElement>('[data-slot="map-points-dot"]')]
}

/** The stroke width and the opacity that the browser paints a dot at. */
function painted(shape: SVGPathElement) {
	const style = getComputedStyle(shape)

	return { width: Number.parseFloat(style.strokeWidth), opacity: Number.parseFloat(style.opacity) }
}

/**
 * Real-Motion check of the dot pop. The other suites mock `motion/react`, and
 * the mock runs no pop.
 *
 * A dot's pop runs once. After it, a new width (a zoom, a regroup) applies at
 * once, and the pop's tween and stagger delay do not run again. The pop is a
 * one-off reveal, and nothing that a reader sees changes at its end. Thus the
 * end of the pop commits no render. A set of 200 dots otherwise renders 200
 * more times.
 */
describe('MapDot pop (real Motion)', () => {
	it('commits no render at the end of the pop', async () => {
		const updates = new Map<string, number>()

		const count: ProfilerOnRenderCallback = (id, phase) => {
			if (phase !== 'mount') updates.set(id, (updates.get(id) ?? 0) + 1)
		}

		const { container } = renderUI(
			<ReducedMotion>
				<svg aria-hidden="true" width={200} height={20} viewBox="0 0 200 20">
					{DELAYS.map((delay) => (
						<Profiler key={delay} id={`dot-${delay}`} onRender={count}>
							{dot(1, delay)}
						</Profiler>
					))}
				</svg>
			</ReducedMotion>,
		)

		await waitFor(() => {
			for (const shape of dots(container)) expect(painted(shape)).toEqual({ width: 8, opacity: 1 })
		})

		// The frames after the pop, where a completion handler commits.
		await frames()

		expect([...updates.values()]).toEqual([])
	})

	it('applies a new width at once after the pop', async () => {
		const svg = (scale: number) => (
			<ReducedMotion>
				<svg aria-hidden="true" width={200} height={20} viewBox="0 0 200 20">
					{dot(scale)}
				</svg>
			</ReducedMotion>
		)

		const { container, rerender } = renderUI(svg(1))

		const [shape] = dots(container)

		if (!shape) throw new Error('expected a dot')

		await waitFor(() => expect(painted(shape)).toEqual({ width: 8, opacity: 1 }))

		await frames()

		rerender(svg(2))

		// The first frame of Motion after the change. A pop that runs again starts
		// below the new width there. After a fixed count of frames, a slow machine
		// can let the 50 ms pop land and hide it.
		expect(
			await sampleMotionFrames(
				() => painted(shape).width,
				() => true,
			),
		).toBe(16)
	})
})
