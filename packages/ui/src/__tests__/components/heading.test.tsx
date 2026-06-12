import { describe, expect, it } from 'vitest'
import { Heading, HeadingSkeleton } from '../../components/heading'
import { Density } from '../../primitives/density'
import { bySlot, renderUI } from '../helpers'

describe('Heading', () => {
	it('renders an h1 by default with data-slot="heading"', () => {
		const { container } = renderUI(<Heading>Title</Heading>)

		const heading = bySlot(container, 'heading')

		expect(heading).toBeInTheDocument()

		expect(heading?.tagName).toBe('H1')
	})

	it.each([1, 2, 3, 4, 5, 6] as const)('renders an h%i when level=%i', (level) => {
		const { container } = renderUI(<Heading level={level}>Title</Heading>)

		const heading = bySlot(container, 'heading')

		expect(heading?.tagName).toBe(`H${level}`)
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Heading id="main-title">Main</Heading>)

		const heading = bySlot(container, 'heading')

		expect(heading).toHaveAttribute('id', 'main-title')
	})

	describe('size', () => {
		it('renders each level at its natural size by default', () => {
			const { container } = renderUI(
				<>
					<Heading level={1}>One</Heading>
					<Heading level={6}>Six</Heading>
				</>,
			)

			const [one, six] = container.querySelectorAll('[data-slot="heading"]')

			expect(one?.className).toContain('text-3xl')
			expect(six?.className).toContain('text-sm')
		})

		it('shifts every level one rung down with size="sm"', () => {
			const { container } = renderUI(
				<>
					<Heading level={1} size="sm">
						One
					</Heading>
					<Heading level={6} size="sm">
						Six
					</Heading>
				</>,
			)

			const [one, six] = container.querySelectorAll('[data-slot="heading"]')

			expect(one?.className).toContain('text-2xl')
			expect(six?.className).toContain('text-xs')
		})

		it('shifts every level one rung up with size="lg"', () => {
			const { container } = renderUI(
				<>
					<Heading level={1} size="lg">
						One
					</Heading>
					<Heading level={3} size="lg">
						Three
					</Heading>
				</>,
			)

			const [one, three] = container.querySelectorAll('[data-slot="heading"]')

			expect(one?.className).toContain('text-4xl')
			expect(three?.className).toContain('text-2xl')
		})

		it('ignores an ambient Density provider', () => {
			const { container } = renderUI(
				<Density size="sm">
					<Heading level={1}>One</Heading>
				</Density>,
			)

			// Static leaf: the rung shifts only through the explicit size prop.
			expect(bySlot(container, 'heading')?.className).toContain('text-3xl')
		})

		it('keeps weight tied to the level regardless of size', () => {
			const { container } = renderUI(
				<Heading level={1} size="sm">
					One
				</Heading>,
			)

			expect(bySlot(container, 'heading')?.className).toContain('font-bold')
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
