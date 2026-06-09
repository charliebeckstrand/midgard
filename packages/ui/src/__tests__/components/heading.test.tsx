import { describe, expect, it } from 'vitest'
import { Heading } from '../../components/heading'
import { Density } from '../../primitives/density'
import { bySlot, expectSlot, itRendersSkeletonPlaceholder, renderUI } from '../helpers'

describe('Heading', () => {
	it('renders an h1 by default with data-slot="heading"', () => {
		const { container } = renderUI(<Heading>Title</Heading>)

		expectSlot(container, 'heading', 'h1')
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

	itRendersSkeletonPlaceholder(<Heading>Title</Heading>, 'heading')

	describe('density', () => {
		it('renders each level at its natural size under neutral (md) density', () => {
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

		it('shifts every level one rung down under compact (sm) density', () => {
			const { container } = renderUI(
				<Density size="sm">
					<Heading level={1}>One</Heading>
					<Heading level={6}>Six</Heading>
				</Density>,
			)

			const [one, six] = container.querySelectorAll('[data-slot="heading"]')

			expect(one?.className).toContain('text-2xl')
			expect(six?.className).toContain('text-xs')
		})

		it('shifts every level one rung up under loose (lg) density', () => {
			const { container } = renderUI(
				<Density size="lg">
					<Heading level={1}>One</Heading>
					<Heading level={3}>Three</Heading>
				</Density>,
			)

			const [one, three] = container.querySelectorAll('[data-slot="heading"]')

			expect(one?.className).toContain('text-4xl')
			expect(three?.className).toContain('text-2xl')
		})

		it('lets an explicit size prop override the ambient density', () => {
			const { container } = renderUI(
				<Density size="sm">
					<Heading level={1} size="lg">
						Hero
					</Heading>
				</Density>,
			)

			expect(bySlot(container, 'heading')?.className).toContain('text-4xl')
		})

		it('keeps weight tied to the level regardless of size', () => {
			const { container } = renderUI(
				<Density size="sm">
					<Heading level={1}>One</Heading>
				</Density>,
			)

			expect(bySlot(container, 'heading')?.className).toContain('font-bold')
		})

		it('tracks the density-shifted rung in the skeleton silhouette', () => {
			const { container: md } = renderUI(<Heading level={1}>One</Heading>, { skeleton: true })

			expect(bySlot(md, 'placeholder')?.className).toContain('h-8')

			const { container: sm } = renderUI(
				<Density size="sm">
					<Heading level={1}>One</Heading>
				</Density>,
				{ skeleton: true },
			)

			expect(bySlot(sm, 'placeholder')?.className).toContain('h-7')
		})
	})
})
