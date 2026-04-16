import { describe, expect, it } from 'vitest'
import { Frame } from '../../components/frame'
import { bySlot, renderUI, screen } from '../helpers'

describe('Frame', () => {
	it('renders with data-slot="frame"', () => {
		const { container } = renderUI(<Frame>content</Frame>)

		const el = bySlot(container, 'frame')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Frame>Hello</Frame>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Frame className="custom">content</Frame>)

		const el = bySlot(container, 'frame')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Frame id="test">content</Frame>)

		const el = bySlot(container, 'frame')

		expect(el).toHaveAttribute('id', 'test')
	})

	it('does not apply default alignment', () => {
		const { container } = renderUI(<Frame>content</Frame>)

		const el = bySlot(container, 'frame')

		expect(el?.className).not.toMatch(/items-/)
	})

	it('does not apply default gap', () => {
		const { container } = renderUI(<Frame>content</Frame>)

		const el = bySlot(container, 'frame')

		expect(el?.className).not.toMatch(/gap-/)
	})
})
