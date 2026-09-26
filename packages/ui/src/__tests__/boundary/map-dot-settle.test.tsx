import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MapDot } from '../../modules/map/map-dot'
import { act, renderUI } from '../helpers'

/**
 * A dot's pop runs once. After it, a new width (a zoom, a regroup) applies at
 * once, and the pop's tween and stagger delay do not run again.
 *
 * The suite reads the props that the dot gives `motion.path`, so it mocks
 * `motion/react`, and sits in `boundary/`.
 */
const paths = vi.hoisted(() => [] as Record<string, unknown>[])

vi.mock('motion/react', () => ({
	motion: {
		path: (props: Record<string, unknown>) => {
			paths.push(props)

			return null
		},
	},
}))

const POP = { duration: 0.3, delay: 0.2 }

function dot(scale: number) {
	return (
		<svg aria-hidden>
			<MapDot
				slot="map-points-dot"
				at={{ x: 10, y: 10 }}
				radius={4}
				scale={scale}
				className=""
				animate
				transition={POP}
			/>
		</svg>
	)
}

describe('MapDot pop', () => {
	beforeEach(() => {
		paths.length = 0
	})

	it('tweens a new width with the pop until the pop completes', () => {
		const { rerender } = renderUI(dot(1))

		rerender(dot(2))

		expect(paths.at(-1)).toMatchObject({ animate: { strokeWidth: 16 }, transition: POP })
	})

	it('applies a new width at once after the pop', () => {
		const { rerender } = renderUI(dot(1))

		const complete = paths.at(-1)?.onAnimationComplete as () => void

		act(() => complete())

		rerender(dot(2))

		expect(paths.at(-1)).toMatchObject({
			animate: { strokeWidth: 16 },
			transition: { duration: 0 },
		})
	})
})
