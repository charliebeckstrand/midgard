import type { MotionValue } from 'motion/react'
import { describe, expect, it, vi } from 'vitest'
import { MapLine } from '../../modules/map/map-line'
import { renderUI, stubMatchMedia } from '../helpers'

/**
 * Under reduced motion a line does not draw itself in. The draw (`pathLength`)
 * is no transform, so the reduced-motion config of motion does not skip it.
 * The suite reads the props that the line gives `motion.path`, so it mocks
 * `motion/react`, and sits in `boundary/`.
 */
const paths = vi.hoisted(() => [] as Record<string, unknown>[])

vi.mock('motion/react', async (importActual) => {
	const actual = await importActual<typeof import('motion/react')>()

	return {
		...actual,
		motion: {
			path: (props: Record<string, unknown>) => {
				paths.push(props)

				return null
			},
		},
	}
})

const DRAW = { duration: 0.3 }

function line() {
	paths.length = 0

	renderUI(
		<svg aria-hidden>
			<MapLine slot="map-route" d="M0 0L10 10" scale={1} className="" animate transition={DRAW} />
		</svg>,
	)

	const props = paths.at(-1) as { style: { pathLength: MotionValue<number> }; transition: unknown }

	return { drawn: props.style.pathLength.get(), transition: props.transition }
}

describe('MapLine draw', () => {
	it('draws in from nothing', () => {
		expect(line()).toEqual({ drawn: 0, transition: DRAW })
	})

	it('mounts whole and completes a draw at once under reduced motion', () => {
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		expect(line()).toEqual({ drawn: 1, transition: { duration: 0 } })
	})
})
