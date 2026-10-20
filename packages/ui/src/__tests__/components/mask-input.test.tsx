import { describe, expect, it, vi } from 'vitest'
import { MaskInput } from '../../components/mask-input'
import { Form } from '../../modules/form'
import { act, bySlot, fireEvent, getSlot, renderUI, screen, setupUser } from '../helpers'

const formatGroups = (raw: string) => {
	const d = raw.replace(/\D/g, '').slice(0, 6)

	if (d.length <= 3) return d

	return `${d.slice(0, 3)}-${d.slice(3)}`
}

describe('MaskInput', () => {
	it('renders an input with data-slot="mask-input"', () => {
		const { container } = renderUI(<MaskInput mask={formatGroups} />)

		const input = bySlot(container, 'mask-input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')
	})

	it('applies the format as the user types', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<MaskInput mask={formatGroups} onValueChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = setupUser()

		await user.type(input, '123456')

		expect(input.value).toBe('123-456')

		expect(onChange).toHaveBeenLastCalledWith('123-456')
	})

	it('keeps the masking handler over a stray native onChange', async () => {
		const onChange = vi.fn()

		// The props type omits `onChange`; an untyped spread can still pass one.
		const stray = { onChange: vi.fn() } as object

		const { container } = renderUI(
			<MaskInput mask={formatGroups} onValueChange={onChange} {...stray} />,
		)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = setupUser()

		await user.type(input, '123456')

		expect(input.value).toBe('123-456')

		expect(onChange).toHaveBeenLastCalledWith('123-456')
	})

	it('formats defaultValue on initial render', () => {
		const { container } = renderUI(<MaskInput mask={formatGroups} defaultValue="123456" />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		expect(input.value).toBe('123-456')
	})

	it('reflects controlled value updates', () => {
		const { container, rerender } = renderUI(<MaskInput mask={formatGroups} value="123" />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		expect(input.value).toBe('123')

		rerender(<MaskInput mask={formatGroups} value="123-456" />)

		expect(input.value).toBe('123-456')
	})

	it('keeps the caret next to the typed character when format inserts separators', async () => {
		const { container } = renderUI(<MaskInput mask={formatGroups} defaultValue="123456" />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		expect(input.value).toBe('123-456')

		input.focus()

		input.setSelectionRange(2, 2)

		const user = setupUser()

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
			<MaskInput mask={format} meaningful={meaningful} defaultValue="ab" />,
		)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		input.focus()

		input.setSelectionRange(1, 1)

		const user = setupUser()

		await user.keyboard('z')

		expect(input.value).toBe('AZB')

		expect(input.selectionStart).toBe(2)
	})

	it('binds to a Form field by name, storing the formatted text', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ code: '' }} onSubmit={onSubmit}>
				<MaskInput name="code" mask={formatGroups} />
				<button type="submit">Submit</button>
			</Form>,
		)

		const user = setupUser()

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		await user.type(input, '123456')

		expect(input.value).toBe('123-456')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ code: '123-456' }),
			expect.anything(),
		)
	})

	it('marks the input invalid while the bound field has an error', async () => {
		const { container } = renderUI(
			<Form
				defaultValues={{ code: '' }}
				validate={{ code: (v) => ((v as string).length < 7 ? 'Too short' : undefined) }}
				validateOn="change"
			>
				<MaskInput name="code" mask={formatGroups} />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		await setupUser().type(input, '12')

		expect(input).toHaveAttribute('aria-invalid', 'true')
	})

	it('goes back to the formatted defaultValue on a native form reset when uncontrolled', async () => {
		const { container } = renderUI(
			<form>
				<MaskInput mask={formatGroups} defaultValue="123" />
				<button type="reset">Reset form</button>
			</form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = setupUser()

		await user.type(input, '456')

		expect(input.value).toBe('123-456')

		fireEvent.click(screen.getByRole('button', { name: 'Reset form' }))

		await act(() => new Promise(requestAnimationFrame))

		expect(input.value).toBe('123')

		await user.type(input, '9')

		expect(input.value).toBe('123-9')
	})

	it('keeps a controlled value on a native form reset', async () => {
		const { container } = renderUI(
			<form>
				<MaskInput mask={formatGroups} value="123456" defaultValue="111" />
				<button type="reset">Reset form</button>
			</form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		fireEvent.click(screen.getByRole('button', { name: 'Reset form' }))

		await act(() => new Promise(requestAnimationFrame))

		expect(input.value).toBe('123-456')
	})
})
