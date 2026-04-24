import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Box } from '../../components/box'
import { bySlot, renderUI, screen } from '../helpers'

describe('Box', () => {
	it('renders with data-slot="box"', () => {
		const { container } = renderUI(<Box>content</Box>)

		const el = bySlot(container, 'box')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Box>Hello</Box>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Box className="custom">content</Box>)

		const el = bySlot(container, 'box')

		expect(el?.className).toContain('custom')
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLDivElement>()

		const { container } = renderUI(<Box ref={ref}>content</Box>)

		expect(ref.current).toBeInstanceOf(HTMLDivElement)

		expect(ref.current).toBe(bySlot(container, 'box'))
	})

	it('renders as a link when href is provided', () => {
		const { container } = renderUI(<Box href="/path">Link</Box>)

		const el = bySlot(container, 'box')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('A')

		expect(el).toHaveAttribute('href', '/path')
	})

	it('forwards ref when rendered as a link', () => {
		const ref = createRef<HTMLAnchorElement>()

		const { container } = renderUI(
			<Box ref={ref as never} href="/path">
				Link
			</Box>,
		)

		expect(ref.current).toBeInstanceOf(HTMLAnchorElement)

		expect(ref.current).toBe(bySlot(container, 'box'))
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Box id="test">content</Box>)

		const el = bySlot(container, 'box')

		expect(el).toHaveAttribute('id', 'test')
	})
})
