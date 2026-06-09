import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../components/form'
import { MaskInput } from '../../components/mask-input'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

const formatGroups = (raw: string) => {
	const d = raw.replace(/\D/g, '').slice(0, 6)

	if (d.length <= 3) return d

	return `${d.slice(0, 3)}-${d.slice(3)}`
}

describe('MaskInput', () => {
	it('renders an input with data-slot="mask-input"', () => {
		const { container } = renderUI(<MaskInput format={formatGroups} />)

		const input = bySlot(container, 'mask-input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<MaskInput format={formatGroups} ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('passes through placeholder', () => {
		const { container } = renderUI(<MaskInput format={formatGroups} placeholder="123-456" />)

		const input = bySlot(container, 'mask-input')

		expect(input).toHaveAttribute('placeholder', '123-456')
	})

	it('applies the format as the user types', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<MaskInput format={formatGroups} onValueChange={onChange} />)

		const input = bySlot(container, 'mask-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '123456')

		expect(input.value).toBe('123-456')

		expect(onChange).toHaveBeenLastCalledWith('123-456')
	})

	it('formats defaultValue on initial render', () => {
		const { container } = renderUI(<MaskInput format={formatGroups} defaultValue="123456" />)

		const input = bySlot(container, 'mask-input') as HTMLInputElement

		expect(input.value).toBe('123-456')
	})

	it('reflects controlled value updates', () => {
		const { container, rerender } = renderUI(<MaskInput format={formatGroups} value="123" />)

		const input = bySlot(container, 'mask-input') as HTMLInputElement

		expect(input.value).toBe('123')

		rerender(<MaskInput format={formatGroups} value="123-456" />)

		expect(input.value).toBe('123-456')
	})

	it('keeps the caret next to the typed character when format inserts separators', async () => {
		const { container } = renderUI(<MaskInput format={formatGroups} defaultValue="123456" />)

		const input = bySlot(container, 'mask-input') as HTMLInputElement

		expect(input.value).toBe('123-456')

		input.focus()

		input.setSelectionRange(2, 2)

		const user = userEvent.setup()

		await user.keyboard('9')

		expect(input.value).toBe('129-345')

		expect(input.selectionStart).toBe(3)
	})

	it('honors a custom meaningful predicate', async () => {
		const format = (raw: string) =>
			raw
				.toUpperCase()
				.replace(/[^A-Z]/g, '')
				.slice(0, 4)

		const meaningful = (c: string) => /[A-Za-z]/.test(c)

		const { container } = renderUI(
			<MaskInput format={format} meaningful={meaningful} defaultValue="ab" />,
		)

		const input = bySlot(container, 'mask-input') as HTMLInputElement

		input.focus()

		input.setSelectionRange(1, 1)

		const user = userEvent.setup()

		await user.keyboard('z')

		expect(input.value).toBe('AZB')

		expect(input.selectionStart).toBe(2)
	})

	it('disables the input when disabled', () => {
		const { container } = renderUI(<MaskInput format={formatGroups} disabled />)

		const input = bySlot(container, 'mask-input')

		expect(input).toBeDisabled()
	})

	it('binds to a Form field by name, storing the formatted text', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ code: '' }} onSubmit={onSubmit}>
				<MaskInput name="code" format={formatGroups} />
				<button type="submit">Submit</button>
			</Form>,
		)

		const user = userEvent.setup()

		const input = bySlot(container, 'mask-input') as HTMLInputElement

		await user.type(input, '123456')

		expect(input.value).toBe('123-456')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ code: '123-456' }),
			expect.anything(),
		)
	})
})
