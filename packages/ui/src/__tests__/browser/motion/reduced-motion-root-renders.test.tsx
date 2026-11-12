import { memo } from 'react'
import { describe, expect, it } from 'vitest'
import { ReducedMotion } from '../../../primitives/reduced-motion'
import * as m from '../../../primitives/reduced-motion/reduced-motion-elements'
import { act, renderUI } from '../../helpers'
import { motionRenders } from '../helpers/motion-renders'

const COUNT = 10

/** The x of each mark that `tone` does not touch. */
const STEADY = Array.from({ length: COUNT - 1 }, (_, index) => index * 10)

/** `COUNT` Motion elements behind a memo. `tone` changes the last one only. */
const Marks = memo(function Marks({ tone }: { tone: number }) {
	return (
		<svg aria-hidden="true" width={100} height={10}>
			{STEADY.map((x) => (
				<m.rect key={x} x={x} width={8} height={8} animate={{ opacity: 1 }} />
			))}

			<m.rect x={90} width={8} height={8} animate={{ opacity: tone }} />
		</svg>
	)
})

/** A root whose owner renders it again with a new `children` element each time. */
function tree(tone: number, layout = false) {
	return (
		<ReducedMotion>
			{layout ? (
				<ReducedMotion layout>
					<Marks tone={tone} />
				</ReducedMotion>
			) : (
				<Marks tone={tone} />
			)}
		</ReducedMotion>
	)
}

/**
 * A render of a `ReducedMotion` root renders only the `m` elements that render
 * for their own reasons. `LazyMotion` gives a new context value each time that
 * it renders, so the root hosts it in a memo. Without the memo, each `m` element
 * in the subtree renders past the memo of its owner. The jsdom suites mock
 * Motion, so only a browser run with real Motion can see it.
 */
describe('ReducedMotion root renders (real Motion)', () => {
	it.each([
		['an animation root', false],
		['a layout root inside an animation root', true],
	])('renders no m element of %s past a memo', async (_, layout) => {
		const { container, rerender } = renderUI(tree(1, layout))

		await act(async () => rerender(tree(1, layout)))

		expect(motionRenders(container)).toBe(0)
	})

	it('renders the m element whose props change', async () => {
		const { container, rerender } = renderUI(tree(1))

		await act(async () => rerender(tree(0.5)))

		// The memo of the marks lets go, so each of them renders. The walk is live.
		expect(motionRenders(container)).toBe(COUNT)
	})
})
