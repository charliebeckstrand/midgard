import { describe, expect, it } from 'vitest'
import { Polymorphic } from '../../primitives'
import { bySlot, renderUI, screen } from '../helpers'

describe('Polymorphic', () => {
	it('renders the fallback element when no href is given', () => {
		const { container } = renderUI(
			<Polymorphic as="span" href={undefined} dataSlot="tag" className="cls">
				Text
			</Polymorphic>,
		)

		const el = bySlot(container, 'tag')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SPAN')
	})

	it('renders a link when href is provided', () => {
		const { container } = renderUI(
			<Polymorphic as="span" href="/path" dataSlot="tag" className="cls">
				Link
			</Polymorphic>,
		)

		const el = bySlot(container, 'tag')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('A')

		expect(el).toHaveAttribute('href', '/path')
	})

	it('applies data-slot and className', () => {
		const { container } = renderUI(
			<Polymorphic as="div" href={undefined} dataSlot="card" className="card-cls">
				Content
			</Polymorphic>,
		)

		const el = bySlot(container, 'card')

		expect(el).toHaveClass('card-cls')
	})

	it('sets type="button" when as="button"', () => {
		const { container } = renderUI(
			<Polymorphic as="button" href={undefined} dataSlot="action" className="">
				Click
			</Polymorphic>,
		)

		const el = bySlot(container, 'action')

		expect(el).toHaveAttribute('type', 'button')
	})

	it('does not set type for non-button elements', () => {
		const { container } = renderUI(
			<Polymorphic as="span" href={undefined} dataSlot="label" className="">
				Label
			</Polymorphic>,
		)

		const el = bySlot(container, 'label')

		expect(el).not.toHaveAttribute('type')
	})

	it('renders children', () => {
		renderUI(
			<Polymorphic as="div" href={undefined} dataSlot="box" className="">
				Hello World
			</Polymorphic>,
		)

		expect(screen.getByText('Hello World')).toBeInTheDocument()
	})
})
