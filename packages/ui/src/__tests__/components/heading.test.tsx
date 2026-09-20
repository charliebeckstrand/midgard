import { describe, expect, it } from 'vitest'
import { Heading, HeadingSkeleton } from '../../components/heading'
import { Density } from '../../primitives/density'
import { headingScale, headingWeight } from '../../recipes/kata/heading'
import { ji } from '../../recipes/kiso'
import { steps } from '../../recipes/kiso/sun'
import { bySlot, present, renderUI } from '../helpers'

// The ladder is `recipes/heading-scale.test.ts`, in node, over all eighteen
// level-by-step pairs. What stays here is the wiring: the component gives
// `headingScale` the level and the step in that order, and the rung it answers
// reaches the recipe. Both expectations derive from the kata, so a deliberate
// move of the scale stays one edit.

const { size } = ji

const levels = [1, 2, 3, 4, 5, 6] as const

const rungs = new Set<string>(Object.values(size))

/**
 * The type-scale classes an element carries.
 *
 * @remarks
 * The rung set keeps the resting ink (`text-zinc-950`) out of the answer, which
 * a `text-` prefix does not. The result is a list, so a caller states that
 * exactly one rung survives the merge.
 *
 * @param el - The rendered heading.
 * @returns Every `ji.size` class on the element, in source order.
 */
const rungsOf = (el: Element) => el.className.split(' ').filter((name) => rungs.has(name))

describe('Heading', () => {
	it('renders an h1 by default with data-slot="heading"', () => {
		const { container } = renderUI(<Heading>Title</Heading>)

		const heading = bySlot(container, 'heading')

		expect(heading).toBeInTheDocument()

		expect(heading?.tagName).toBe('H1')
	})

	it.each(levels)('renders an h%i when level=%i', (level) => {
		const { container } = renderUI(<Heading level={level}>Title</Heading>)

		const heading = bySlot(container, 'heading')

		expect(heading?.tagName).toBe(`H${level}`)
	})

	describe('size', () => {
		it.each(steps)('renders every level at its %s rung', (step) => {
			const rendered = levels.map((level) => {
				const { container } = renderUI(
					<Heading level={level} size={step}>
						Title
					</Heading>,
				)

				return rungsOf(present(bySlot(container, 'heading'), `the level ${level} heading`))
			})

			expect(rendered).toStrictEqual(levels.map((level) => [size[headingScale(level, step)]]))
		})

		it('ignores an ambient Density provider', () => {
			const { container } = renderUI(
				<Density size="sm">
					<Heading level={1}>One</Heading>
				</Density>,
			)

			// Static leaf: the rung shifts only through the explicit size prop.
			expect(bySlot(container, 'heading')?.className).toContain(size[headingScale(1, 'md')])
		})

		it.each(levels)('keeps level %i at its own weight regardless of size', (level) => {
			const { container } = renderUI(
				<Heading level={level} size="sm">
					Title
				</Heading>,
			)

			expect(bySlot(container, 'heading')?.className).toContain(headingWeight(level))
		})
	})

	describe('skeleton', () => {
		it('tracks the size-shifted rung in the skeleton silhouette', () => {
			const { container: md } = renderUI(<HeadingSkeleton level={1} />)

			expect(bySlot(md, 'placeholder')?.className).toContain('h-8')

			const { container: sm } = renderUI(<HeadingSkeleton level={1} size="sm" />)

			expect(bySlot(sm, 'placeholder')?.className).toContain('h-7')
		})
	})
})
