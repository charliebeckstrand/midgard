import { type ComponentPropsWithoutRef, createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Polymorphic, PolymorphicStatic } from '../../primitives/polymorphic'
import { bySlot, renderUI } from '../helpers'

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
})

describe('Polymorphic ref and rel', () => {
	it('forwards ref to the link and to the fallback element', () => {
		const linkRef = createRef<HTMLAnchorElement>()

		const fallbackRef = createRef<HTMLSpanElement>()

		renderUI(
			<>
				<Polymorphic as="span" href="/path" ref={linkRef} data-slot="link" className="">
					Link
				</Polymorphic>
				<Polymorphic as="span" ref={fallbackRef} data-slot="label" className="">
					Label
				</Polymorphic>
			</>,
		)

		expect(linkRef.current?.tagName).toBe('A')

		expect(fallbackRef.current?.tagName).toBe('SPAN')
	})

	it('gives a link that opens a new tab noopener noreferrer', () => {
		const { container } = renderUI(
			<Polymorphic as="span" href="/path" target="_blank" data-slot="tag" className="">
				Link
			</Polymorphic>,
		)

		expect(bySlot(container, 'tag')).toHaveAttribute('rel', 'noopener noreferrer')
	})

	it('keeps a caller rel', () => {
		const { container } = renderUI(
			<Polymorphic
				as="span"
				href="/path"
				target="_blank"
				rel="external"
				data-slot="tag"
				className=""
			>
				Link
			</Polymorphic>,
		)

		expect(bySlot(container, 'tag')).toHaveAttribute('rel', 'external')
	})
})

describe('PolymorphicStatic', () => {
	it('keeps the ref of the render element when the call site passes none', () => {
		const ref = createRef<HTMLAnchorElement>()

		const { container } = renderUI(
			<PolymorphicStatic
				as="span"
				href="/path"
				data-slot="tag"
				className="cls"
				render={<a ref={ref} href="/ignored" />}
			>
				Link
			</PolymorphicStatic>,
		)

		expect(ref.current).toBe(bySlot(container, 'tag'))
	})

	it('gives the call-site ref precedence over the ref of the render element', () => {
		const renderRef = createRef<HTMLAnchorElement>()

		const ref = createRef<HTMLAnchorElement>()

		const { container } = renderUI(
			<PolymorphicStatic
				as="span"
				href="/path"
				ref={ref}
				data-slot="tag"
				className="cls"
				render={<a ref={renderRef} href="/ignored" />}
			>
				Link
			</PolymorphicStatic>,
		)

		expect(ref.current).toBe(bySlot(container, 'tag'))

		expect(renderRef.current).toBeNull()
	})
})
