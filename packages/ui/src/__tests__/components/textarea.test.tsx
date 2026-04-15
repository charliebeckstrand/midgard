import { describe, expect, it, vi } from 'vitest'
import { Textarea } from '../../components/textarea'
import { bySlot, renderUI, userEvent } from '../helpers'

describe('Textarea', () => {
	it('renders with data-slot="textarea"', () => {
		const { container } = renderUI(<Textarea />)

		const el = bySlot(container, 'textarea')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('TEXTAREA')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Textarea className="custom" />)

		const el = bySlot(container, 'textarea')

		expect(el?.className).toContain('custom')
	})

	it('passes through placeholder', () => {
		const { container } = renderUI(<Textarea placeholder="Enter text" />)

		const el = bySlot(container, 'textarea') as HTMLTextAreaElement

		expect(el.placeholder).toBe('Enter text')
	})

	it('fires onChange handler', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<Textarea onChange={onChange} />)

		const el = bySlot(container, 'textarea') as HTMLTextAreaElement

		const user = userEvent.setup()

		await user.type(el, 'a')

		expect(onChange).toHaveBeenCalled()
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Textarea />, { skeleton: true })

		expect(bySlot(container, 'textarea')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})
