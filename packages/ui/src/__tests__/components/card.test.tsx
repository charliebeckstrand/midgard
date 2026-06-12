import { describe, expect, it } from 'vitest'
import { Button, ButtonSkeleton } from '../../components/button'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/card'
import { DensityProvider } from '../../providers/density'
import { bySlot, renderUI } from '../helpers'

describe('Card', () => {
	it('keeps its frame around explicit skeleton children', () => {
		const { container } = renderUI(
			<Card>
				<ButtonSkeleton />
			</Card>,
		)

		// Loading trees compose skeleton variants explicitly; the card keeps
		// its frame around them.
		expect(bySlot(container, 'card')).toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})

describe('Card size system', () => {
	it('defaults to md and exposes data-size for descendants', () => {
		const { container } = renderUI(<Card>content</Card>)

		expect(bySlot(container, 'card')).toHaveAttribute('data-size', 'md')
	})

	it('reflects an explicit size prop on data-size', () => {
		const { container } = renderUI(<Card size="lg">content</Card>)

		expect(bySlot(container, 'card')).toHaveAttribute('data-size', 'lg')
	})

	it('renders an inner-radius class matching the resolved size', () => {
		const { container } = renderUI(<Card>content</Card>)

		expect(bySlot(container, 'card')?.className).toContain('rounded-md')
	})

	it('projects sm section padding onto direct children', () => {
		const { container } = renderUI(
			<Card size="sm">
				<CardBody>body</CardBody>
			</Card>,
		)

		// The static CardBody carries its own md padding; the sm card overrides
		// it from outside through the section projection.
		expect(bySlot(container, 'card')?.className).toContain('*:data-[slot=card-body]:p-2')
		expect(bySlot(container, 'card-body')?.className).toContain('p-3')
	})

	it('projects lg section padding onto direct children', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardHeader>header</CardHeader>
			</Card>,
		)

		const cls = bySlot(container, 'card')?.className ?? ''

		expect(cls).toContain('*:data-[slot=card-header]:px-4')
		expect(cls).toContain('*:data-[slot=card-header]:pt-4')
	})

	it('carries no section projection at the md default', () => {
		const { container } = renderUI(
			<Card>
				<CardBody>body</CardBody>
			</Card>,
		)

		// At md the section's own classes already match; omitting the
		// projection keeps a consumer className on the section authoritative.
		expect(bySlot(container, 'card')?.className).not.toContain('*:data-[slot=card-body]')
	})

	it('CardTitle text size follows its explicit size prop, bumped one step up', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardTitle size="lg">Title</CardTitle>
			</Card>,
		)

		// CardTitle size "lg" → bumps to ji.size.xl = 'text-xl'
		expect(bySlot(container, 'card-title')?.className).toContain('text-xl')
	})

	it('CardTitle defaults to the md rung regardless of the Card size', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardTitle>Title</CardTitle>
			</Card>,
		)

		// Static leaf: no inherited size. md → bumps one rung to ji.size.lg.
		expect(bySlot(container, 'card-title')?.className).toContain('text-lg')
	})

	it('CardTitle weight is derived from its heading level', () => {
		const { container } = renderUI(
			<Card>
				<CardTitle>Title</CardTitle>
			</Card>,
		)

		// Default level 3 → Heading semibold; weight comes from the Heading, not the card recipe.
		expect(bySlot(container, 'card-title')?.className).toContain('font-semibold')
	})

	it('CardTitle weight tracks an overridden heading level', () => {
		const { container } = renderUI(
			<Card>
				<CardTitle level={1}>Title</CardTitle>
			</Card>,
		)

		// level 1 → Heading bold, proving the weight follows the level through Heading.
		expect(bySlot(container, 'card-title')?.className).toContain('font-bold')
	})

	it('Buttons inside a Card keep their own size', () => {
		const { container } = renderUI(
			<Card size="sm">
				<CardBody>
					<Button>Inside</Button>
				</CardBody>
			</Card>,
		)

		// The static Card opens no density scope; the Button renders at its own
		// md default. Pass an explicit size to match a non-md card.
		expect(bySlot(container, 'button')?.className).toContain('text-base')
	})

	it('ignores an ambient Density provider', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Card>content</Card>
			</DensityProvider>,
		)

		// Static leaf: ambient density reaches client components only.
		expect(bySlot(container, 'card')).toHaveAttribute('data-size', 'md')
	})

	it('renders nested cards at their own size', () => {
		const { container } = renderUI(
			<Card size="sm">
				<CardBody>
					<Card>inner</Card>
				</CardBody>
			</Card>,
		)

		const cards = container.querySelectorAll<HTMLElement>('[data-slot="card"]')
		// The inner card defaults to md; the outer size does not cascade, and
		// the direct-child section projection cannot reach into it.
		expect(cards[1]).toHaveAttribute('data-size', 'md')
	})

	// Card always carries a static `p-{density}`; the `:has(>[data-slot=card-…])`
	// selectors zero that padding when structural slot children (CardHeader/
	// CardBody/CardFooter) own the layout. Content slots (CardTitle/
	// CardDescription) supply no padding of their own and must not collapse
	// the frame.
	it('suppresses its outer padding only for structural slot children', () => {
		const { container } = renderUI(
			<Card size="md">
				<CardBody>body</CardBody>
			</Card>,
		)

		const cls = bySlot(container, 'card')?.className ?? ''

		expect(cls).toContain('[&:has(>[data-slot=card-header])]:p-0')
		expect(cls).toContain('[&:has(>[data-slot=card-body])]:p-0')
		expect(cls).toContain('[&:has(>[data-slot=card-footer])]:p-0')

		// No prefix selector: it would also match content slots like card-title.
		expect(cls).not.toContain('[&:has(>[data-slot^=card-])]:p-0')
	})
})
