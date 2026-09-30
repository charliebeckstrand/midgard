import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../components/form'
import { MaskInput, phoneMask } from '../../components/mask-input'
import { bySlot, getSlot, renderUI, screen, userEvent } from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

describe('phoneMask', () => {
	it('renders an input with type tel and a phone icon prefix by default', () => {
		const { container } = renderUI(<MaskInput mask={phoneMask()} />)

		const input = bySlot(container, 'mask-input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('type', 'tel')

		expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('formats US numbers as the user types', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<MaskInput mask={phoneMask()} onValueChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '5551234567')

		expect(input.value).toBe('(555) 123-4567')

		expect(onChange).toHaveBeenLastCalledWith('(555) 123-4567')
	})

	it('strips non-digit characters for US country', async () => {
		const { container } = renderUI(<MaskInput mask={phoneMask()} />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = userEvent.setup({ delay: null })

		await user.type(input, 'abc555')

		expect(input.value).toBe('555')
	})

	it('preserves leading + for international country', async () => {
		const { container } = renderUI(<MaskInput mask={phoneMask('international')} />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '+14155551234')

		expect(input.value).toBe('+14155551234')
	})

	it('keeps the caret next to the typed digit when format inserts separators', async () => {
		const { container } = renderUI(<MaskInput mask={phoneMask()} defaultValue="5556789" />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		expect(input.value).toBe('555-6789')

		input.focus()

		input.setSelectionRange(2, 2)

		const user = userEvent.setup({ delay: null })

		await user.keyboard('1')

		expect(input.value).toBe('(551) 567-89')

		expect(input.selectionStart).toBe(4)
	})

	it('renders a custom prefix in place of the default phone icon', () => {
		const { container } = renderUI(
			<MaskInput mask={phoneMask()} prefix={<span data-testid="custom-prefix">PHN</span>} />,
		)

		expect(container.querySelector('[data-testid="custom-prefix"]')).toBeInTheDocument()
	})

	it('preserves a leading + with no digits for international country', async () => {
		const { container } = renderUI(<MaskInput mask={phoneMask('international')} />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '+')

		expect(input.value).toBe('+')
	})

	it.each<[string, ReturnType<typeof phoneMask>, string, string]>([
		['formats a US defaultValue on initial render', phoneMask(), '5551234567', '(555) 123-4567'],
		[
			'strips a leading country-code 1 from an 11-digit US number',
			phoneMask(),
			'15551234567',
			'(555) 123-4567',
		],
		[
			'formats digits without a + for international country',
			phoneMask('international'),
			'14155551234',
			'14155551234',
		],
		['renders an empty string for an empty US value', phoneMask(), '', ''],
	])('%s', (_name, mask, defaultValue, expected) => {
		const { container } = renderUI(<MaskInput mask={mask} defaultValue={defaultValue} />)

		expect(getSlot<HTMLInputElement>(container, 'mask-input').value).toBe(expected)
	})

	it('binds to a Form field by name, storing the formatted text', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ phone: '' }} onSubmit={onSubmit}>
				<MaskInput mask={phoneMask()} name="phone" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const user = userEvent.setup({ delay: null })

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		await user.type(input, '5551234567')

		expect(input.value).toBe('(555) 123-4567')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ phone: '(555) 123-4567' }),
			expect.anything(),
		)
	})

	it('marks the form field touched on blur', async () => {
		const { container } = renderUI(
			<Form defaultValues={{ phone: '' }}>
				<MaskInput mask={phoneMask()} name="phone" />
				<FieldProbe name="phone" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = userEvent.setup({ delay: null })

		await user.click(input)

		expect(getFieldProbe('phone')).toHaveAttribute('data-touched', 'false')

		await user.tab()

		expect(getFieldProbe('phone')).toHaveAttribute('data-touched', 'true')
	})
})
