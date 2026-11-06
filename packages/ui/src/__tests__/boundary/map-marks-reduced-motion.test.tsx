import type { MotionValue } from 'motion/react'
import { describe, expect, it, vi } from 'vitest'
import { MapDot, MapDotCount, MapDotRing } from '../../modules/map/map-dot'
import { MapLine } from '../../modules/map/map-line'
import { ReducedMotionContext } from '../../primitives/reduced-motion/context'
import { renderUI, stubMatchMedia } from '../helpers'

/**
 * Under reduced motion a line does not draw itself in, and a dot does not pop.
 * The draw (`pathLength`) and the pop (opacity and `strokeWidth` from one motion
 * value) are no transform, so the reduced-motion config of motion does not skip
 * them. The suite reads the props that each mark gives `m.path` and `m.text`,
 * so it mocks `motion/react-m`, and sits in `boundary/`.
 */
const paths = vi.hoisted(() => new Map<string, Record<string, unknown>>())

vi.mock('motion/react-m', () => {
	const record = (props: Record<string, unknown>) => {
		paths.set(String(props['data-slot']), props)

		return null
	}

	return { path: record, text: record }
})

const REVEAL = { duration: 0.3 }

type Revealed = { style: Record<string, MotionValue<number>>; transition: unknown }

function marks() {
	paths.clear()

	renderUI(
		<svg aria-hidden>
			<MapLine slot="map-route" d="M0 0L10 10" scale={1} className="" animate transition={REVEAL} />
			<MapDot
				slot="map-points-dot"
				at={{ x: 10, y: 10 }}
				radius={4}
				scale={1}
				className=""
				animate
				transition={REVEAL}
			/>
		</svg>,
	)

	const line = paths.get('map-route') as Revealed

	const dot = paths.get('map-points-dot') as Revealed

	return {
		line: { drawn: line.style.pathLength?.get(), transition: line.transition },
		dot: { shown: dot.style.opacity?.get(), transition: dot.transition },
	}
}

describe('map mark reveals', () => {
	it('draw the line and pop the dot from nothing', () => {
		expect(marks()).toEqual({
			line: { drawn: 0, transition: REVEAL },
			dot: { shown: 0, transition: REVEAL },
		})
	})

	it('mount whole and complete at once under reduced motion', () => {
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		expect(marks()).toEqual({
			line: { drawn: 1, transition: { duration: 0 } },
			dot: { shown: 1, transition: { duration: 0 } },
		})
	})

	it('complete a draw in flight at once when reduced motion turns on', () => {
		paths.clear()

		const line = (still: boolean) => (
			<ReducedMotionContext value={still}>
				<svg aria-hidden>
					<MapLine
						slot="map-route"
						d="M0 0L10 10"
						scale={1}
						className=""
						animate
						transition={REVEAL}
					/>
				</svg>
			</ReducedMotionContext>
		)

		const { rerender } = renderUI(line(false))

		const drawn = () => (paths.get('map-route') as Revealed).style.pathLength?.get()

		expect(drawn()).toBe(0)

		// The target of the draw does not change, so motion starts no new animation. The
		// draw must end here, not after its own tween.
		rerender(line(true))

		expect(drawn()).toBe(1)
	})

	it('show the count and the ring of a summary at once under reduced motion', () => {
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		paths.clear()

		// The last dot of a long reveal, which waits out the whole stagger.
		const late = { duration: 0.3, delay: 0.6 }

		renderUI(
			<svg aria-hidden>
				<MapDotCount
					at={{ x: 10, y: 10 }}
					count={3}
					className=""
					scale={1}
					animate
					transition={late}
				/>
				<MapDotRing
					at={{ x: 10, y: 10 }}
					radius={8}
					arcs={[
						{ id: 'a', count: 2, paint: '' },
						{ id: 'b', count: 1, paint: '' },
					]}
					scale={1}
					animate
					transition={late}
				/>
			</svg>,
		)

		expect({
			count: paths.get('map-points-count')?.transition,
			ring: paths.get('map-points-share')?.transition,
		}).toEqual({ count: { duration: 0 }, ring: { duration: 0 } })
	})
})
