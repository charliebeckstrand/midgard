import { describe, expect, it } from 'vitest'
import { Radio } from '../../components/radio'
import { bySlot, renderUI } from '../helpers'

describe('Radio', () => {
	it('renders with data-slot="radio"', () => {
		const { container } = renderUI(<Radio />)

		const el = bySlot(container, 'radio')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('INPUT')
	})

	it('renders as a radio input', () => {
		const { container } = renderUI(<Radio />)

		const el = bySlot(container, 'radio') as HTMLInputElement

		expect(el.type).toBe('radio')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Radio className="custom" />)

		const el = bySlot(container, 'radio')

		expect(el?.className).toContain('custom')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Radio />, { skeleton: true })

		expect(bySlot(container, 'radio')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Radio name="choice" value="a" />)

		const el = bySlot(container, 'radio') as HTMLInputElement

		expect(el.name).toBe('choice')

		expect(el.value).toBe('a')
	})
})
