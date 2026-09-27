import { describe, expect, it } from 'vitest'
import { Button, ButtonSkeleton } from '../../components/button'
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '../../components/card'
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
	// jsdom loads no stylesheet, so these cases check the scope and the classes.
	// density-scope.test.tsx checks the computed styles in a real browser.
	it('opens no scope without a size, so it follows the scope around it', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Card>content</Card>
			</DensityProvider>,
		)

		expect(bySlot(container, 'card')).not.toHaveAttribute('data-density')
	})

	it('opens a scope at an explicit size', () => {
		const { container } = renderUI(<Card size="lg">content</Card>)

		expect(bySlot(container, 'card')).toHaveAttribute('data-density', 'lg')
	})

	it('carries each padding and radius step on the frame', () => {
		const { container } = renderUI(<Card>content</Card>)

		expect(bySlot(container, 'card')).toHaveClass(
			'density-sm:p-2',
			'density-md:p-3',
			'density-lg:p-4',
			'density-sm:rounded-sm',
			'density-md:rounded-md',
			'density-lg:rounded-lg',
		)
	})

	it('pads the header and the footer on the edges that they share with the body', () => {
		const { container } = renderUI(
			<Card>
				<CardHeader>header</CardHeader>
				<CardBody>body</CardBody>
				<CardFooter>footer</CardFooter>
			</Card>,
		)

		expect(bySlot(container, 'card-header')).toHaveClass(
			'density-sm:pb-2',
			'density-md:pb-3',
			'density-lg:pb-4',
		)

		expect(bySlot(container, 'card-footer')).toHaveClass(
			'density-sm:pt-2',
			'density-md:pt-3',
			'density-lg:pt-4',
		)

		expect(bySlot(container, 'card-body')?.className ?? '').not.toMatch(/\bp[a-z]?-\d/)
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

	it('Buttons inside a sized Card inherit its size', () => {
		const { container } = renderUI(
			<Card size="sm">
				<CardBody>
					<Button>Inside</Button>
				</CardBody>
			</Card>,
		)

		// An explicit size opens a density scope; the client Button resolves
		// its size through it.
		expect(bySlot(container, 'button')?.className).toContain('text-sm')
	})

	it('Buttons inside an unsized Card follow the ambient density', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Card>
					<CardBody>
						<Button>Inside</Button>
					</CardBody>
				</Card>
			</DensityProvider>,
		)

		// No explicit size, no scope of its own: the ambient cascade reaches
		// the client Button untouched.
		expect(bySlot(container, 'button')?.className).toContain('text-sm')
	})

	// The frame owns the outer padding on every edge: Card carries its padding
	// steps for any child, structural or bare, and never collapses it.
	// Sections pad only the inner edge they share with a sibling, so the body
	// itself carries no padding.
	it('keeps its frame padding around a structural section', () => {
		const { container } = renderUI(
			<Card size="md">
				<CardBody>body</CardBody>
			</Card>,
		)

		const cls = bySlot(container, 'card')?.className ?? ''

		// Frame padding survives — no `:has` collapse zeroes it.
		expect(cls).toContain('density-md:p-3')

		expect(cls).not.toContain(':p-0')

		// The body leans on the frame; it brings no padding of its own.
		expect(bySlot(container, 'card-body')?.className ?? '').not.toMatch(/\bp-\d/)
	})
})
