import { describe, expect, it } from 'vitest'
import {
	Card,
	CardBody,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../../components/card'
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
