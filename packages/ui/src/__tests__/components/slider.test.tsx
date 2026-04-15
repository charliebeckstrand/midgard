import { describe, expect, it } from 'vitest'
import { Slider } from '../../components/slider'
import { bySlot, renderUI } from '../helpers'

describe('Slider', () => {
	it('renders with data-slot="slider"', () => {
		const { container } = renderUI(<Slider />)

		const el = bySlot(container, 'slider')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('INPUT')
	})

	it('renders as a range input', () => {
		const { container } = renderUI(<Slider />)

		const el = bySlot(container, 'slider') as HTMLInputElement

		expect(el.type).toBe('range')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Slider className="custom" />)

		const el = bySlot(container, 'slider')

		expect(el?.className).toContain('custom')
	})

	it('passes through min, max, and step', () => {
		const { container } = renderUI(<Slider min={0} max={50} step={5} />)

		const el = bySlot(container, 'slider') as HTMLInputElement

		expect(el.min).toBe('0')

		expect(el.max).toBe('50')

		expect(el.step).toBe('5')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Slider id="test" />)

		const el = bySlot(container, 'slider')

		expect(el).toHaveAttribute('id', 'test')
	})
})
