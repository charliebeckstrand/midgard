import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import {
	StackedLayout,
	StackedLayoutBody,
	StackedLayoutFooter,
	StackedLayoutHeader,
} from '../../layouts/stacked'
import { bySlot, renderUI, screen } from '../helpers'

describe('StackedLayout', () => {
	it('renders children', () => {
		renderUI(<StackedLayout>Hello</StackedLayout>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<StackedLayout className="custom">content</StackedLayout>)

		const el = bySlot(container, 'stack')

		expect(el?.className).toContain('custom')
	})
})

describe('StackedLayoutHeader', () => {
	it('renders with data-slot="header"', () => {
		const { container } = renderUI(<StackedLayoutHeader>content</StackedLayoutHeader>)

		const el = bySlot(container, 'header')

		expect(el).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<StackedLayoutHeader className="custom">content</StackedLayoutHeader>,
		)

		const el = bySlot(container, 'header')

		expect(el?.className).toContain('custom')
	})

	it('renders children', () => {
		renderUI(<StackedLayoutHeader>Header text</StackedLayoutHeader>)

		expect(screen.getByText('Header text')).toBeInTheDocument()
	})
})

describe('StackedLayoutBody', () => {
	it('renders with data-slot="body"', () => {
		const { container } = renderUI(<StackedLayoutBody>content</StackedLayoutBody>)

		const el = bySlot(container, 'body')

		expect(el).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<StackedLayoutBody className="custom">content</StackedLayoutBody>,
		)

		const el = bySlot(container, 'body')

		expect(el?.className).toContain('custom')
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLDivElement>()

		const { container } = renderUI(<StackedLayoutBody ref={ref}>content</StackedLayoutBody>)

		expect(ref.current).toBeInstanceOf(HTMLDivElement)

		expect(ref.current).toBe(bySlot(container, 'body'))
	})
})

describe('StackedLayoutFooter', () => {
	it('renders with data-slot="footer"', () => {
		const { container } = renderUI(<StackedLayoutFooter>content</StackedLayoutFooter>)

		const el = bySlot(container, 'footer')

		expect(el).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<StackedLayoutFooter className="custom">content</StackedLayoutFooter>,
		)

		const el = bySlot(container, 'footer')

		expect(el?.className).toContain('custom')
	})

	it('renders children', () => {
		renderUI(<StackedLayoutFooter>Footer text</StackedLayoutFooter>)

		expect(screen.getByText('Footer text')).toBeInTheDocument()
	})
})
