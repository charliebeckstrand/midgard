import { describe, expect, it } from 'vitest'
import { Button, ButtonSkeleton } from '../../components/button'
import {
	Card,
	CardBody,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../../components/card'
import { DensityProvider } from '../../providers/density'
import { bySlot, densityStepOf, present, renderUI } from '../helpers'

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
			'density-p-[1,2,3,4,5]',
			'density-rounded-[sm,md,lg]',
		)
	})

	it('pads the header and the footer only on an edge that they share with a sibling', () => {
		const { container } = renderUI(
			<Card>
				<CardHeader>header</CardHeader>
				<CardBody>body</CardBody>
				<CardFooter>footer</CardFooter>
			</Card>,
		)

		const header = present(bySlot(container, 'card-header'), 'card header')

		const footer = present(bySlot(container, 'card-footer'), 'card footer')

		// The header pads its bottom edge when a sibling follows it.
		expect(header).toHaveClass('not-last:density-pb-[1,2,3,4,5]')

		// The footer pads its top edge when a sibling other than a header comes before it.
		expect(footer).toHaveClass('[:not([data-slot=card-header])+&]:density-pt-[1,2,3,4,5]')

		// No pad applies with no condition, so an outer edge keeps the one pad of the frame.
		expect(header).not.toHaveClass('density-pb-[1,2,3,4,5]')

		expect(footer).not.toHaveClass('density-pt-[1,2,3,4,5]')

		expect(bySlot(container, 'card-body')?.className ?? '').not.toMatch(/\bp[a-z]?-\d/)
	})

	it('CardTitle with a size is a density scope on the title ramp', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardTitle size="lg">Title</CardTitle>
			</Card>,
		)

		const title = present(bySlot(container, 'card-title'), 'card title')

		expect(title).toHaveAttribute('data-density', 'lg')

		expect(title).toHaveClass('density-text-[sm,base,lg,xl,2xl]')
	})

	it('CardTitle with no size follows the Card scope on the title ramp', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardTitle>Title</CardTitle>
			</Card>,
		)

		const title = present(bySlot(container, 'card-title'), 'card title')

		// The ramp replaces the fixed size of the heading level, so the scope selects the size.
		expect(title).toHaveClass('density-text-[sm,base,lg,xl,2xl]')

		expect(title).not.toHaveClass('text-xl')

		expect(title.closest('[data-density]')).toHaveAttribute('data-density', 'lg')
	})

	it('CardTitle with a size keeps that step inside a Card of another step', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardTitle size="sm">Title</CardTitle>
			</Card>,
		)

		expect(densityStepOf(present(bySlot(container, 'card-title'), 'card title'))).toBe('sm')
	})

	it('CardDescription follows the Card scope on the small text ramp', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardHeader>
					<CardDescription>Description</CardDescription>
				</CardHeader>
			</Card>,
		)

		const description = present(bySlot(container, 'card-description'), 'card description')

		// The ramp replaces a fixed size, so the scope selects the size. The md step is text-sm.
		expect(description).toHaveClass('density-text-[2xs,xs,sm,base,lg]')

		expect(description).not.toHaveClass('text-sm')

		expect(description.closest('[data-density]')).toHaveAttribute('data-density', 'lg')
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
		expect(densityStepOf(present(bySlot(container, 'button'), 'button'))).toBe('sm')
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
		expect(densityStepOf(present(bySlot(container, 'button'), 'button'))).toBe('sm')
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
		expect(cls).toContain('density-p-[1,2,3,4,5]')

		expect(cls).not.toContain(':p-0')

		// The body leans on the frame; it brings no padding of its own.
		expect(bySlot(container, 'card-body')?.className ?? '').not.toMatch(/\bp-\d/)
	})
})
