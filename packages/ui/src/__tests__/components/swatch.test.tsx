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
})
