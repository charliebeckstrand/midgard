import { AnimatePresence, domAnimation, type FeatureBundle, LazyMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { describe, expect, it } from 'vitest'
import { bySlot, deferred, present, renderUI, waitFor } from '../../helpers'
import { nextPaint } from '../../helpers/frames'

/**
 * Real-Motion check of an `m` element whose features arrive after it mounts. A
 * `ReducedMotion` root loads the features in a chunk after the root mounts, so
 * a root that mounts at hydration renders before they arrive.
 *
 * The setup of this project loads the features before each suite, and a root
 * then gives them in its first render. These cases hold the bundle of a
 * `LazyMotion` back by hand instead, so they do not depend on that state.
 */
describe('m element before its features arrive (real Motion)', () => {
	it('shows the initial style, and animates to the target when the features arrive', async () => {
		const bundle = deferred<FeatureBundle>()

		const { container } = renderUI(
			<LazyMotion features={() => bundle.promise}>
				<m.div
					data-slot="late"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.05 }}
				/>
			</LazyMotion>,
		)

		const element = () => present<HTMLElement>(bySlot(container, 'late'), 'late')

		await nextPaint()

		expect(getComputedStyle(element()).opacity).toBe('0')

		bundle.resolve(domAnimation)

		await waitFor(() => expect(getComputedStyle(element()).opacity).toBe('1'))
	})

	it('removes an element that leaves before the features arrive', async () => {
		const bundle = deferred<FeatureBundle>()

		const tree = (shown: boolean) => (
			<LazyMotion features={() => bundle.promise}>
				<AnimatePresence>
					{shown && <m.div key="leaving" data-slot="leaving" exit={{ opacity: 0 }} />}
				</AnimatePresence>
			</LazyMotion>
		)

		const { container, rerender } = renderUI(tree(true))

		await nextPaint()

		rerender(tree(false))

		await waitFor(() => expect(bySlot(container, 'leaving')).toBeNull())
	})
})
