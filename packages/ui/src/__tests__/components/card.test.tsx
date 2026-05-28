import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import {
	Card,
	CardBody,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../../components/card'
import { Density } from '../../providers/density'
import { bySlot, renderUI, screen } from '../helpers'

describe('Card', () => {
	it('renders with data-slot="card"', () => {
		const { container } = renderUI(<Card>content</Card>)

		const el = bySlot(container, 'card')

		expect(el).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<Card>Hello</Card>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Card className="custom">content</Card>)

		const el = bySlot(container, 'card')

		expect(el?.className).toContain('custom')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Card>content</Card>, { skeleton: true })

		expect(bySlot(container, 'card')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})

describe('CardHeader', () => {
	it('renders with data-slot="card-header"', () => {
		const { container } = renderUI(
			<Card>
				<CardHeader>header</CardHeader>
			</Card>,
		)

		expect(bySlot(container, 'card-header')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Card>
				<CardHeader className="custom">header</CardHeader>
			</Card>,
		)

		const el = bySlot(container, 'card-header')

		expect(el?.className).toContain('custom')
	})
})

describe('CardTitle', () => {
	it('renders with data-slot="card-title"', () => {
		const { container } = renderUI(
			<Card>
				<CardTitle>Title</CardTitle>
			</Card>,
		)

		expect(bySlot(container, 'card-title')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(
			<Card>
				<CardTitle>My Title</CardTitle>
			</Card>,
		)

		expect(screen.getByText('My Title')).toBeInTheDocument()
	})
})

describe('CardDescription', () => {
	it('renders with data-slot="card-description"', () => {
		const { container } = renderUI(
			<Card>
				<CardDescription>Desc</CardDescription>
			</Card>,
		)

		expect(bySlot(container, 'card-description')).toBeInTheDocument()
	})
})

describe('CardBody', () => {
	it('renders with data-slot="card-body"', () => {
		const { container } = renderUI(
			<Card>
				<CardBody>Body</CardBody>
			</Card>,
		)

		expect(bySlot(container, 'card-body')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Card>
				<CardBody className="custom">Body</CardBody>
			</Card>,
		)

		const el = bySlot(container, 'card-body')

		expect(el?.className).toContain('custom')
	})
})

describe('CardFooter', () => {
	it('renders with data-slot="card-footer"', () => {
		const { container } = renderUI(
			<Card>
				<CardFooter>Footer</CardFooter>
			</Card>,
		)

		expect(bySlot(container, 'card-footer')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Card>
				<CardFooter className="custom">Footer</CardFooter>
			</Card>,
		)

		const el = bySlot(container, 'card-footer')

		expect(el?.className).toContain('custom')
	})
})

describe('Card size system', () => {
	it('defaults to md and exposes data-step for descendants', () => {
		const { container } = renderUI(<Card>content</Card>)

		expect(bySlot(container, 'card')).toHaveAttribute('data-step', 'md')
	})

	it('reflects an explicit size prop on data-step', () => {
		const { container } = renderUI(<Card size="lg">content</Card>)

		expect(bySlot(container, 'card')).toHaveAttribute('data-step', 'lg')
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
			<Density density="compact">
				<Card>content</Card>
			</Density>,
		)

		expect(bySlot(container, 'card')).toHaveAttribute('data-step', 'sm')
	})

	it('explicit size prop wins over an ambient Density', () => {
		const { container } = renderUI(
			<Density density="compact">
				<Card size="lg">content</Card>
			</Density>,
		)

		expect(bySlot(container, 'card')).toHaveAttribute('data-step', 'lg')
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
		expect(cards[1]).toHaveAttribute('data-step', 'sm')
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
