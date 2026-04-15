import { describe, expect, it } from 'vitest'
import { Icon } from '../../components/icon'
import { bySlot, renderUI } from '../helpers'

describe('Icon', () => {
	it('renders with data-slot="icon"', () => {
		const { container } = renderUI(<Icon icon={<svg />} />)

		const el = bySlot(container, 'icon')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('svg')
	})

	it('is hidden from assistive technology', () => {
		const { container } = renderUI(<Icon icon={<svg />} />)

		const el = bySlot(container, 'icon')

		expect(el).toHaveAttribute('aria-hidden', 'true')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Icon icon={<svg />} className="custom" />)

		const el = bySlot(container, 'icon')

		expect(el?.getAttribute('class')).toContain('custom')
	})

	it('applies numeric size as inline style', () => {
		const { container } = renderUI(<Icon icon={<svg />} size={24} />)

		const el = bySlot(container, 'icon')

		expect(el).toHaveStyle({ width: '24px', height: '24px' })
	})
})
