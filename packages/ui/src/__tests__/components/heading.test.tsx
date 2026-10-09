import { describe, expect, it } from 'vitest'
import { Heading, HeadingSkeleton } from '../../components/heading'
import { k, scale } from '../../recipes/kata/heading'
import { ji } from '../../recipes/kiso'
import { bySlot, getSlot, renderUI } from '../helpers'

// The ramps and their rungs are `recipes/heading-ramp.test.ts`, in node. What
// stays here is the wiring: the heading carries the ramp of its level, and an
// explicit `size` makes it a density scope.

const { size } = ji

const levels = [1, 2, 3, 4, 5, 6] as const

const rungs = new Set<string>(Object.values(size))

/**
 * The fixed type-scale classes an element carries.
 *
 * @remarks
 * The rung set keeps the resting ink (`text-zinc-950`) out of the answer, which
 * a `text-` prefix does not.
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
		it.each(scale)('makes the heading a density scope at %s', (step) => {
			const rendered = levels.map((level) => {
				const { container } = renderUI(
					<Heading level={level} size={step}>
						Title
					</Heading>,
				)

				const heading = getSlot(container, 'heading')

				return [heading.getAttribute('data-density'), heading.classList.contains(k.ramp[level])]
			})

			expect(rendered).toStrictEqual(levels.map(() => [step, true]))
		})

		it.each(levels)('takes the density ramp of level %i with no size', (level) => {
			const { container } = renderUI(<Heading level={level}>Title</Heading>)

			// Static leaf: the stepped class selects the rung in CSS from the nearest scope.
			// `browser/density-scope.test.tsx` holds the computed size.
			const heading = getSlot(container, 'heading')

			expect(heading.className.split(' ')).toContain(k.ramp[level])

			expect(rungsOf(heading)).toStrictEqual([])
		})

		it.each(levels)('keeps level %i at its own weight regardless of size', (level) => {
			const { container } = renderUI(
				<Heading level={level} size="sm">
					Title
				</Heading>,
			)

			expect(bySlot(container, 'heading')?.className).toContain(k.weight[level])
		})
	})

	describe('skeleton', () => {
		it('makes the silhouette a density scope at an explicit size', () => {
			const { container } = renderUI(<HeadingSkeleton level={1} size="sm" />)

			const placeholder = bySlot(container, 'placeholder')

			expect(placeholder).toHaveAttribute('data-density', 'sm')

			expect(placeholder).toHaveClass('density-h-[6,7,8,9,10]')
		})

		it('takes the density ramp with no size', () => {
			const { container } = renderUI(<HeadingSkeleton level={1} />)

			expect(bySlot(container, 'placeholder')?.className).toContain('density-h-[6,7,8,9,10]')
		})
	})
})
