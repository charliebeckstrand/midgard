import { describe, expect, it } from 'vitest'
import { Swatch } from '../../components/swatch'
import { bySlot, renderUI } from '../helpers'

describe('Swatch', () => {
	it('passes through HTML attributes and applies the currentColor class', () => {
		const { container } = renderUI(<Swatch color="text-blue-600" id="test" />)

		const el = bySlot(container, 'swatch')

		expect(el).toHaveAttribute('id', 'test')

		expect(el).toHaveClass('text-blue-600')
	})

	it('is decorative (no role or name) by default', () => {
		const { container } = renderUI(<Swatch shape="circle" color="text-red-600" />)

		const el = bySlot(container, 'swatch')

		// Colour alone conveys meaning: a bare swatch exposes no role or name.
		expect(el).not.toHaveAttribute('role')

		expect(el).not.toHaveAttribute('aria-label')
	})

	it('exposes a text alternative as role="img" when given a label', () => {
		const { container } = renderUI(<Swatch color="text-green-600" label="Revenue" />)

		const el = bySlot(container, 'swatch')

		expect(el).toHaveAttribute('role', 'img')

		expect(el).toHaveAccessibleName('Revenue')
	})

	it('reflects shape and variant on data attributes', () => {
		const { container } = renderUI(<Swatch shape="line" variant="outline" color="text-blue-600" />)

		const el = bySlot(container, 'swatch')

		expect(el).toHaveAttribute('data-shape', 'line')

		expect(el).toHaveAttribute('data-variant', 'outline')
	})

	it('fills the solid variant from currentColor', () => {
		const { container } = renderUI(<Swatch variant="solid" color="text-blue-600" />)

		expect(bySlot(container, 'swatch')).toHaveClass('bg-current')
	})

	it('strokes the dashed line variant as a currentColor dash run', () => {
		const { container } = renderUI(<Swatch shape="line" variant="dashed" color="text-blue-600" />)

		const el = bySlot(container, 'swatch')

		expect(el).toHaveAttribute('data-variant', 'dashed')

		// A repeating currentColor gradient paints the dashes, so the swatch mirrors
		// a dashed reference rule without an SVG.
		expect(el?.getAttribute('class')).toContain('repeating-linear-gradient')
	})

	it('frames the dashed square and circle variants with a dashed border', () => {
		for (const shape of ['square', 'circle'] as const) {
			const { container } = renderUI(
				<Swatch shape={shape} variant="dashed" color="text-blue-600" />,
			)

			const el = bySlot(container, 'swatch')

			expect(el).toHaveAttribute('data-variant', 'dashed')

			// A box or dot has no length to dash, so it frames with a dashed border —
			// not the line's gradient fill.
			expect(el).toHaveClass('border-dashed')

			expect(el?.getAttribute('class')).not.toContain('repeating-linear-gradient')
		}
	})

	it('resolves a palette slot name to its currentColor class', () => {
		const { container } = renderUI(<Swatch color="blue" />)

		const el = bySlot(container, 'swatch')

		// A named slot inks through the CVD-validated kata/chart class, not inline.
		expect(el).toHaveClass('text-blue-600')

		expect(el?.getAttribute('style')).toBeFalsy()
	})

	it('inks a raw hex colour inline on currentColor', () => {
		const { container } = renderUI(<Swatch color="#2563eb" />)

		const el = bySlot(container, 'swatch')

		expect(el).toHaveStyle({ color: '#2563eb' })

		// A raw colour has no class form, so no text-* utility is applied.
		expect(el?.getAttribute('class')).not.toMatch(/\btext-/)
	})

	it('inks a raw oklch colour inline on currentColor', () => {
		const { container } = renderUI(<Swatch color="oklch(0.62 0.19 259)" />)

		const el = bySlot(container, 'swatch')

		expect(el).toHaveStyle({ color: 'oklch(0.62 0.19 259)' })
	})

	it('lets an explicit style prop win over a raw colour', () => {
		const { container } = renderUI(<Swatch color="#2563eb" style={{ color: 'rgb(1, 2, 3)' }} />)

		expect(bySlot(container, 'swatch')).toHaveStyle({ color: 'rgb(1, 2, 3)' })
	})
})
