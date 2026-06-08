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

	it('exposes a meaningful icon with role="img" and a label', () => {
		const { container } = renderUI(<Icon icon={<svg />} label="Search" />)

		const el = bySlot(container, 'icon')

		expect(el).toHaveAttribute('role', 'img')

		expect(el).toHaveAttribute('aria-label', 'Search')

		expect(el).not.toHaveAttribute('aria-hidden')
	})

	it('applies numeric size as inline style', () => {
		const { container } = renderUI(<Icon icon={<svg />} size={24} />)

		const el = bySlot(container, 'icon')

		expect(el).toHaveStyle({ width: '24px', height: '24px' })
	})

	it('preserves the className on the cloned icon element', () => {
		const { container } = renderUI(<Icon icon={<svg className="text-red-500" />} />)

		expect(bySlot(container, 'icon')?.getAttribute('class')).toContain('text-red-500')
	})

	it('does not shrink inside a flex container', () => {
		const { container } = renderUI(<Icon icon={<svg />} />)

		const el = bySlot(container, 'icon')

		expect(el?.getAttribute('class')).toContain('shrink-0')
	})
})
