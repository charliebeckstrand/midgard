import type { ComponentProps } from 'react'
import { describe, expect, it } from 'vitest'
import { Icon } from '../../components/icon'
import { bySlot, renderUI } from '../helpers'

/** An icon component of the shape callers write: it forwards what the clone injects. */
function Glyph(props: ComponentProps<'svg'>) {
	return <svg {...props} />
}

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

	it('sizes a component element that forwards its props', () => {
		// Every other case here hands `Icon` an intrinsic `<svg />`, which cannot drop what is
		// cloned onto it. A component element can: one declaring no props swallows the class and
		// the slot, and the glyph falls back to its library's own size.
		const { container } = renderUI(<Icon icon={<Glyph />} />)

		const el = bySlot(container, 'icon')

		expect(el).toBeInTheDocument()

		expect(el?.getAttribute('class')).toContain('size-5')
	})

	it('does not shrink inside a flex container', () => {
		const { container } = renderUI(<Icon icon={<svg />} />)

		const el = bySlot(container, 'icon')

		expect(el?.getAttribute('class')).toContain('shrink-0')
	})
})
