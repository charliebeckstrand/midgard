import type { MotionValue } from 'motion/react'
import { describe, expect, it, vi } from 'vitest'
import { MapDot } from '../../modules/map/map-dot'
import { MapLine } from '../../modules/map/map-line'
import { renderUI, stubMatchMedia } from '../helpers'

/**
 * Under reduced motion a line does not draw itself in, and a dot does not pop.
 * The draw (`pathLength`) and the pop (opacity and `strokeWidth` from one motion
 * value) are no transform, so the reduced-motion config of motion does not skip
 * them. The suite reads the props that each mark gives `m.path`, so it
 * mocks `motion/react-m`, and sits in `boundary/`.
 */
const paths = vi.hoisted(() => new Map<string, Record<string, unknown>>())

vi.mock('motion/react-m', () => ({
	path: (props: Record<string, unknown>) => {
		paths.set(String(props['data-slot']), props)

		return null
	},
}))

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
})
