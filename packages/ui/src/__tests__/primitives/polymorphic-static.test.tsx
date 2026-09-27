import { type ComponentProps, createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PolymorphicStatic } from '../../primitives/polymorphic'
import { bySlot, renderUI } from '../helpers'

// A stand-in for a router link: it renders an anchor and marks itself, so a
// test can tell the `render` element from the plain anchor fallback.
function RouterLink(props: ComponentProps<'a'>) {
	return <a data-router="" {...props} />
}

describe('PolymorphicStatic', () => {
	it('renders the fallback element when no href is given', () => {
		const { container } = renderUI(
			<PolymorphicStatic as="span" data-slot="tag" className="cls">
				Text
			</PolymorphicStatic>,
		)

		expect(bySlot(container, 'tag')?.tagName).toBe('SPAN')
	})

	it('renders a plain anchor when href is set and render is not', () => {
		const { container } = renderUI(
			<PolymorphicStatic as="span" href="/path" data-slot="tag" className="cls">
				Link
			</PolymorphicStatic>,
		)

		const el = bySlot(container, 'tag')

		expect(el?.tagName).toBe('A')

		expect(el).toHaveAttribute('href', '/path')

		expect(el).not.toHaveAttribute('data-router')
	})

	it('renders the render element with the resolved props and the children', () => {
		const { container } = renderUI(
			<PolymorphicStatic
				as="span"
				href="/path"
				render={<RouterLink href="" />}
				data-slot="tag"
				className="cls"
			>
				Link
			</PolymorphicStatic>,
		)

		const el = bySlot(container, 'tag')

		expect(el).toHaveAttribute('data-router')

		expect(el).toHaveAttribute('href', '/path')

		expect(el).toHaveClass('cls')

		expect(el).toHaveTextContent('Link')
	})

	it('keeps the props of the render element that the call site does not set', () => {
		const { container } = renderUI(
			<PolymorphicStatic
				as="span"
				href="/path"
				render={<RouterLink href="" className="router" title="Go" />}
				data-slot="tag"
				className="cls"
			>
				Link
			</PolymorphicStatic>,
		)

		const el = bySlot(container, 'tag')

		expect(el).toHaveClass('router', 'cls')

		expect(el).toHaveAttribute('title', 'Go')
	})

	it('keeps the ref of the render element when the call site passes no ref', () => {
		const renderRef = createRef<HTMLAnchorElement>()

		renderUI(
			<PolymorphicStatic
				as="span"
				href="/path"
				render={<RouterLink href="" ref={renderRef} />}
				data-slot="tag"
				className=""
			>
				Link
			</PolymorphicStatic>,
		)

		expect(renderRef.current?.tagName).toBe('A')
	})

	it('gives the node to the call-site ref when both refs are set', () => {
		const renderRef = createRef<HTMLAnchorElement>()

		const callRef = createRef<HTMLAnchorElement>()

		renderUI(
			<PolymorphicStatic
				as="span"
				href="/path"
				render={<RouterLink href="" ref={renderRef} />}
				ref={callRef}
				data-slot="tag"
				className=""
			>
				Link
			</PolymorphicStatic>,
		)

		expect(callRef.current?.tagName).toBe('A')
	})

	it('runs the handler of the render element, then the call-site handler', () => {
		const calls: string[] = []

		const renderClick = vi.fn(() => calls.push('render'))

		const callClick = vi.fn(() => calls.push('call'))

		const { container } = renderUI(
			<PolymorphicStatic
				as="span"
				href="#target"
				render={<RouterLink href="" onClick={renderClick} />}
				onClick={callClick}
				data-slot="tag"
				className=""
			>
				Link
			</PolymorphicStatic>,
		)

		bySlot(container, 'tag')?.click()

		expect(calls).toEqual(['render', 'call'])
	})

	it('forwards ref to the plain anchor and to the fallback element', () => {
		const linkRef = createRef<HTMLAnchorElement>()

		const fallbackRef = createRef<HTMLSpanElement>()

		renderUI(
			<>
				<PolymorphicStatic as="span" href="/path" ref={linkRef} data-slot="link" className="">
					Link
				</PolymorphicStatic>
				<PolymorphicStatic as="span" ref={fallbackRef} data-slot="label" className="">
					Label
				</PolymorphicStatic>
			</>,
		)

		expect(linkRef.current?.tagName).toBe('A')

		expect(fallbackRef.current?.tagName).toBe('SPAN')
	})

	it('gives a link that opens a new tab noopener noreferrer, on both link arms', () => {
		const { container } = renderUI(
			<>
				<PolymorphicStatic as="span" href="/a" target="_blank" data-slot="plain" className="">
					Plain
				</PolymorphicStatic>
				<PolymorphicStatic
					as="span"
					href="/b"
					target="_blank"
					render={<RouterLink href="" />}
					data-slot="routed"
					className=""
				>
					Routed
				</PolymorphicStatic>
			</>,
		)

		expect(bySlot(container, 'plain')).toHaveAttribute('rel', 'noopener noreferrer')

		expect(bySlot(container, 'routed')).toHaveAttribute('rel', 'noopener noreferrer')
	})

	it('sets type="button" on a button fallback, and a caller type wins', () => {
		const { container } = renderUI(
			<>
				<PolymorphicStatic as="button" data-slot="plain" className="">
					Plain
				</PolymorphicStatic>
				<PolymorphicStatic as="button" type="submit" data-slot="submit" className="">
					Submit
				</PolymorphicStatic>
			</>,
		)

		expect(bySlot(container, 'plain')).toHaveAttribute('type', 'button')

		expect(bySlot(container, 'submit')).toHaveAttribute('type', 'submit')
	})
})
