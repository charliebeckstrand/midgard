import type { ComponentPropsWithoutRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Polymorphic } from '../../primitives/polymorphic'
import { bySlot, renderUI, screen } from '../helpers'

describe('Polymorphic', () => {
	it('renders the fallback element when no href is given', () => {
		const { container } = renderUI(
			<Polymorphic as="span" href={undefined} data-slot="tag" className="cls">
				Text
			</Polymorphic>,
		)

		const el = bySlot(container, 'tag')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SPAN')
	})

	it('renders a link when href is provided', () => {
		const { container } = renderUI(
			<Polymorphic as="span" href="/path" data-slot="tag" className="cls">
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
			<Polymorphic as="div" href={undefined} data-slot="card" className="card-cls">
				Content
			</Polymorphic>,
		)

		const el = bySlot(container, 'card')

		expect(el).toHaveClass('card-cls')
	})

	it('sets type="button" when as="button"', () => {
		const { container } = renderUI(
			<Polymorphic as="button" href={undefined} data-slot="action" className="">
				Click
			</Polymorphic>,
		)

		const el = bySlot(container, 'action')

		expect(el).toHaveAttribute('type', 'button')
	})

	it('does not set type for non-button elements', () => {
		const { container } = renderUI(
			<Polymorphic as="span" href={undefined} data-slot="label" className="">
				Label
			</Polymorphic>,
		)

		const el = bySlot(container, 'label')

		expect(el).not.toHaveAttribute('type')
	})

	it('renders a custom component passed to as', () => {
		function Card({ children, ...props }: ComponentPropsWithoutRef<'section'>) {
			return <section {...props}>{children}</section>
		}

		const { container } = renderUI(
			<Polymorphic as={Card} href={undefined} data-slot="card" className="cls">
				Content
			</Polymorphic>,
		)

		const el = bySlot(container, 'card')

		expect(el?.tagName).toBe('SECTION')
	})

	it('renders a link when href is set even if as is a custom component', () => {
		function Card({ children, ...props }: ComponentPropsWithoutRef<'section'>) {
			return <section {...props}>{children}</section>
		}

		const { container } = renderUI(
			<Polymorphic as={Card} href="/path" data-slot="card" className="cls">
				Link
			</Polymorphic>,
		)

		const el = bySlot(container, 'card')

		expect(el?.tagName).toBe('A')

		expect(el).toHaveAttribute('href', '/path')
	})

	it('renders children', () => {
		renderUI(
			<Polymorphic as="div" href={undefined} data-slot="box" className="">
				Hello World
			</Polymorphic>,
		)

		expect(screen.getByText('Hello World')).toBeInTheDocument()
	})
})
