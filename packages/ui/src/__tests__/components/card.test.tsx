import type { ReactElement } from 'react'
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
	it.each<[string, () => ReactElement, string]>([
		['defaults to md and exposes data-size for descendants', () => <Card>content</Card>, 'md'],
		['reflects an explicit size prop on data-size', () => <Card size="lg">content</Card>, 'lg'],
		[
			// Static leaf: ambient density reaches client components only.
			'ignores an ambient Density provider',
			() => (
				<DensityProvider density="compact">
					<Card>content</Card>
				</DensityProvider>
			),
			'md',
		],
	])('%s', (_name, ui, expected) => {
		const { container } = renderUI(ui())

		expect(bySlot(container, 'card')).toHaveAttribute('data-size', expected)
	})

	it('renders an inner-radius class matching the resolved size', () => {
		const { container } = renderUI(<Card>content</Card>)

		expect(bySlot(container, 'card')?.className).toContain('rounded-md')
	})

	it.each<[string, () => ReactElement, string]>([
		[
			'sm',
			() => (
				<Card size="sm">
					<CardHeader>header</CardHeader>
				</Card>
			),
			'pb-2',
		],
		[
			'the md default',
			() => (
				<Card>
					<CardHeader>header</CardHeader>
				</Card>
			),
			'pb-3',
		],
		[
			'lg',
			() => (
				<Card size="lg">
					<CardHeader>header</CardHeader>
				</Card>
			),
			'pb-4',
		],
	])('projects the %s header gap onto direct children', (_label, ui, expected) => {
		const { container } = renderUI(ui())

		// CardHeader carries none of its own gap at any step; the card is the
		// single source, so even the md default shows up as a projection.
		expect(bySlot(container, 'card')?.className).toContain(`*:data-[slot=card-header]:${expected}`)

		expect(bySlot(container, 'card-header')?.className ?? '').not.toMatch(/\bpb-\d/)
	})

	it('keeps the header gap when a body does not directly follow it', () => {
		const { container } = renderUI(
			<Card>
				<CardHeader>header</CardHeader>
				<CardFooter>footer</CardFooter>
			</Card>,
		)

		// The header-collapse rule only matches a CardBody next sibling; it's
		// present in the class list but its `:has()` guard won't fire here, so
		// the plain md gap projection from the section table is what applies.
		expect(bySlot(container, 'card')?.className).toContain('*:data-[slot=card-header]:pb-3')
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

	// The frame owns the outer padding on every edge: Card carries a static
	// `p-{density}` for any child, structural or bare, and never collapses it.
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
		expect(cls).toContain('p-3')

		expect(cls).not.toContain(':p-0')

		// The body leans on the frame; it brings no padding of its own.
		expect(bySlot(container, 'card-body')?.className ?? '').not.toMatch(/\bp-\d/)
	})
})
