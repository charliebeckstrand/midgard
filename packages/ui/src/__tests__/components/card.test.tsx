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
import { sun } from '../../recipes/ryu/sun'
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

	it('emits the concentric formula CSS variables from sun', () => {
		const { container } = renderUI(<Card size="md">content</Card>)

		const card = bySlot(container, 'card')

		expect(card?.style.getPropertyValue('--ui-radius-inner')).toBe(`var(--radius-${sun.md.radius})`)
		expect(card?.style.getPropertyValue('--ui-padding')).toBe(
			`calc(var(--spacing) * ${sun.md.space})`,
		)
	})

	it('renders the radius class for its size step', () => {
		const { container } = renderUI(<Card>content</Card>)

		expect(bySlot(container, 'card')?.className).toContain(`rounded-${sun.md.radius}`)
	})

	it('CardBody padding tracks the Card size', () => {
		const { container } = renderUI(
			<Card size="sm">
				<CardBody>body</CardBody>
			</Card>,
		)

		expect(bySlot(container, 'card-body')?.className).toContain(`p-${sun.sm.space}`)
	})

	it('CardHeader padding tracks the Card size', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardHeader>header</CardHeader>
			</Card>,
		)

		const space = sun.lg.space

		expect(bySlot(container, 'card-header')?.className).toContain(`px-${space}`)
		expect(bySlot(container, 'card-header')?.className).toContain(`pt-${space}`)
	})

	it('CardTitle text size tracks the Card size', () => {
		const { container } = renderUI(
			<Card size="lg">
				<CardTitle>Title</CardTitle>
			</Card>,
		)

		// sun.lg.text = 'lg' → ji.size.lg = 'text-lg/7'
		expect(bySlot(container, 'card-title')?.className).toContain('text-lg/7')
	})

	it('Buttons inside a Card inherit the Card size', () => {
		const { container } = renderUI(
			<Card size="sm">
				<CardBody>
					<Button>Inside</Button>
				</CardBody>
			</Card>,
		)

		// sun.sm.text = 'sm' → ji.size.sm = 'text-sm/5'
		expect(bySlot(container, 'button')?.className).toContain('text-sm/5')
	})
})
