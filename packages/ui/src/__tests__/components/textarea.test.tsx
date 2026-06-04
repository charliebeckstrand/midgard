import { describe, expect, it, vi } from 'vitest'
import { Textarea } from '../../components/textarea'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

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

	it('picks up the glass variant from a glass context', () => {
		const { container } = renderUI(<Textarea />, { glass: true })

		expect(bySlot(container, 'textarea')).toBeInTheDocument()
	})

	it('renders with autoResize enabled', () => {
		const { container } = renderUI(<Textarea autoResize />)

		expect(bySlot(container, 'textarea')).toBeInTheDocument()
	})

	it('renders with an explicit resize prop', () => {
		const { container } = renderUI(<Textarea resize="none" />)

		expect(bySlot(container, 'textarea')).toBeInTheDocument()
	})

	it('renders actions next to the textarea', () => {
		const { container } = renderUI(<Textarea actions={<span>send</span>} />)

		expect(bySlot(container, 'textarea')).toBeInTheDocument()

		expect(screen.getByText('send')).toBeInTheDocument()
	})

	it('coerces a nullish controlled value to an empty string and stays controlled', async () => {
		// A wrapper signalling "empty" with value={null} must keep the textarea
		// controlled rather than silently flipping it to uncontrolled.
		const { container } = renderUI(<Textarea value={null as never} onChange={() => {}} />)

		const el = bySlot(container, 'textarea') as HTMLTextAreaElement

		expect(el.value).toBe('')

		const user = userEvent.setup()

		await user.type(el, 'abc')

		// Controlled with a fixed '' value: keystrokes can't mutate it.
		expect(el.value).toBe('')
	})

	it('stays uncontrolled when no value prop is passed', async () => {
		const { container } = renderUI(<Textarea defaultValue="hi" />)

		const el = bySlot(container, 'textarea') as HTMLTextAreaElement

		expect(el.value).toBe('hi')

		const user = userEvent.setup()

		await user.type(el, ' there')

		expect(el.value).toBe('hi there')
	})
})
