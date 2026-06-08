import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/card'
import { DensityProvider } from '../../providers/density'
import { bySlot, renderUI } from '../helpers'

describe('Card', () => {
	it('passes through to children in skeleton mode', () => {
		const { container } = renderUI(
			<Card>
				<Button>action</Button>
			</Card>,
			{ skeleton: true },
		)

		// The card keeps its frame; the child skeletonizes itself.
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

	it('CardBody picks its padding from the surrounding density', () => {
		const { container } = renderUI(
			<Card size="sm">
				<CardBody>body</CardBody>
			</Card>,
		)

		expect(bySlot(container, 'card-body')?.className).toContain('p-2')
	})

	it('CardHeader picks its padding from the surrounding density', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardHeader>header</CardHeader>
			</Card>,
		)

		const cls = bySlot(container, 'card-header')?.className ?? ''

		expect(cls).toContain('px-4')
		expect(cls).toContain('pt-4')
	})

	it('CardTitle text size tracks the Card size, bumped one step up', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardTitle>Title</CardTitle>
			</Card>,
		)

		// Card size "lg" → CardTitle bumps to ji.size.xl = 'text-xl'
		expect(bySlot(container, 'card-title')?.className).toContain('text-xl')
	})

	it('CardTitle size prop overrides the inherited Card size', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardTitle size="sm">Title</CardTitle>
			</Card>,
		)

		// CardTitle size "sm" → bumps to ji.size.md = 'text-base'
		expect(bySlot(container, 'card-title')?.className).toContain('text-base')
	})

	it('CardTitle text size tracks an ambient Density provider', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<CardTitle>Title</CardTitle>
			</DensityProvider>,
		)

		// compact → sm step → titleSize drops one rung to ji.size.md = 'text-base'
		expect(bySlot(container, 'card-title')?.className).toContain('text-base')
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

	it('Buttons inside a Card inherit the Card size', () => {
		const { container } = renderUI(
			<Card size="sm">
				<CardBody>
					<Button>Inside</Button>
				</CardBody>
			</Card>,
		)

		// sun.sm.text = 'sm' → ji.size.sm = 'text-sm'
		expect(bySlot(container, 'button')?.className).toContain('text-sm')
	})

	it('inherits an ambient Density when no size prop is given', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Card>content</Card>
			</DensityProvider>,
		)

		expect(bySlot(container, 'card')).toHaveAttribute('data-size', 'sm')
	})

	it('explicit size prop wins over an ambient Density', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Card size="lg">content</Card>
			</DensityProvider>,
		)

		expect(bySlot(container, 'card')).toHaveAttribute('data-size', 'lg')
	})

	it('inherits the resolved size from an outer Card when no size prop is given', () => {
		const { container } = renderUI(
			<Card size="sm">
				<CardBody>
					<Card>inner</Card>
				</CardBody>
			</Card>,
		)

		const cards = container.querySelectorAll<HTMLElement>('[data-slot="card"]')
		// inner card is the second match
		expect(cards[1]).toHaveAttribute('data-size', 'sm')
	})

	// Card always carries a static `p-{density}` so callers can compose with
	// Box's normal padding contract; the `:has(>[data-slot^=card-])` selector
	// zeroes that padding when slot children (CardHeader/CardBody/etc.) own
	// the layout, preventing the outer + inner double-padding regression.
	it('suppresses its outer padding when card slot children are present', () => {
		const { container } = renderUI(
			<Card size="md">
				<CardBody>body</CardBody>
			</Card>,
		)

		const cls = bySlot(container, 'card')?.className ?? ''

		expect(cls).toContain('[&:has(>[data-slot^=card-])]:p-0')
	})
})
