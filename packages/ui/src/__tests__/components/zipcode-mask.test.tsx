import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MaskInput, zipcodeMask } from '../../components/mask-input'
import { Form } from '../../modules/form'
import { bySlot, getSlot, renderUI, screen, setupUser } from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

describe('zipcodeMask', () => {
	it('renders an input with a map-pin icon prefix by default', () => {
		const { container } = renderUI(<MaskInput mask={zipcodeMask()} />)

		const input = bySlot(container, 'mask-input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')

		expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('renders a custom prefix in place of the default map-pin icon', () => {
		const { container } = renderUI(
			<MaskInput mask={zipcodeMask()} prefix={<span data-testid="custom-prefix">ZIP</span>} />,
		)

		expect(container.querySelector('[data-testid="custom-prefix"]')).toBeInTheDocument()
	})

	it('uses a country-appropriate default placeholder', () => {
		const { container } = renderUI(<MaskInput mask={zipcodeMask('CA')} />)

		const input = bySlot(container, 'mask-input')

		expect(input).toHaveAttribute('placeholder', 'A1A 1A1')
	})

	it('lets an explicit prop override a preset default', () => {
		const { container } = renderUI(
			<MaskInput mask={zipcodeMask('CA')} placeholder="Postal code" inputMode="numeric" />,
		)

		const input = bySlot(container, 'mask-input')

		expect(input).toHaveAttribute('placeholder', 'Postal code')

		expect(input).toHaveAttribute('inputmode', 'numeric')

		expect(input).toHaveAttribute('autocomplete', 'postal-code')
	})

	it('formats US ZIP+4 with a dash', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<MaskInput mask={zipcodeMask()} onValueChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = setupUser()

		await user.type(input, '941031234')

		expect(input.value).toBe('94103-1234')

		expect(onChange).toHaveBeenLastCalledWith('94103-1234')
	})

	it('strips non-digit characters for US', async () => {
		const { container } = renderUI(<MaskInput mask={zipcodeMask()} />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = setupUser()

		await user.type(input, 'abc94103xyz')

		expect(input.value).toBe('94103')
	})

	it('uppercases and spaces Canadian postal codes', async () => {
		const { container } = renderUI(<MaskInput mask={zipcodeMask('CA')} />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = setupUser()

		await user.type(input, 'k1a0b1')

		expect(input.value).toBe('K1A 0B1')
	})

	it.each<[string, ComponentProps<typeof MaskInput>, string]>([
		[
			'formats defaultValue on initial render',
			{ mask: zipcodeMask(), defaultValue: '941031234' },
			'94103-1234',
		],
		[
			'uppercases GB postcodes while preserving an internal space',
			{ mask: zipcodeMask('GB'), defaultValue: 'sw1a 1aa' },
			'SW1A 1AA',
		],
		[
			'strips invalid characters and collapses whitespace for GB',
			{ mask: zipcodeMask('GB'), defaultValue: 'sw1a  1aa@@' },
			'SW1A 1AA',
		],
		[
			'caps GB postcodes at seven characters',
			{ mask: zipcodeMask('GB'), defaultValue: 'abcdefghijk' },
			'ABCDEFG',
		],
		[
			'places the GB space before the inward code',
			{ mask: zipcodeMask('GB'), defaultValue: 'm11ae' },
			'M1 1AE',
		],
		[
			'passes international codes through, truncated to twelve characters',
			{ mask: zipcodeMask('international'), defaultValue: 'abc-123 def/456' },
			'abc-123 def/',
		],
	])('%s', (_name, props, expected) => {
		const { container } = renderUI(<MaskInput {...props} />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		expect(input.value).toBe(expected)
	})

	it.each<[string, ReturnType<typeof zipcodeMask>, string, string]>([
		['a GB postcode with its space', zipcodeMask('GB'), 'sw1a 1aa', 'SW1A 1AA'],
		['a GB postcode with no space', zipcodeMask('GB'), 'sw1a1aa', 'SW1A 1AA'],
		['an international code with a space', zipcodeMask('international'), '1234 AB', '1234 AB'],
		['an international code with a hyphen', zipcodeMask('international'), '00-950', '00-950'],
	])('keeps the caret at the end while the user types %s', async (_name, mask, typed, value) => {
		const { container } = renderUI(<MaskInput mask={mask} />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		input.focus()

		await setupUser().keyboard(typed)

		await Promise.resolve()

		expect(input.value).toBe(value)

		expect(input.selectionStart).toBe(value.length)
	})

	it.each<[string, ReturnType<typeof zipcodeMask>, string, number, string]>([
		['a letter in the US mask', zipcodeMask(), '12345', 3, 'a'],
		['a + in the CA mask', zipcodeMask('CA'), 'K1A 0B1', 2, '+'],
		['a + in the GB mask', zipcodeMask('GB'), 'SW1A 1AA', 2, '+'],
	])(
		'keeps the caret in place when the format drops %s',
		async (_name, mask, defaultValue, caret, key) => {
			const { container } = renderUI(<MaskInput mask={mask} defaultValue={defaultValue} />)

			const input = getSlot<HTMLInputElement>(container, 'mask-input')

			const before = input.value

			input.focus()

			input.setSelectionRange(caret, caret)

			await setupUser().keyboard(key)

			await Promise.resolve()

			expect(input.value).toBe(before)

			expect(input.selectionStart).toBe(caret)
		},
	)

	it('uses an empty default placeholder for international codes', () => {
		const { container } = renderUI(<MaskInput mask={zipcodeMask('international')} />)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		expect(input).toHaveAttribute('placeholder', '')

		expect(input).toHaveAttribute('inputmode', 'text')
	})

	it('binds to a Form field by name, storing the formatted text', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ zip: '' }} onSubmit={onSubmit}>
				<MaskInput mask={zipcodeMask()} name="zip" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const user = setupUser()

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		await user.type(input, '941031234')

		expect(input.value).toBe('94103-1234')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ zip: '94103-1234' }),
			expect.anything(),
		)
	})

	it('marks the form field touched on blur', async () => {
		const { container } = renderUI(
			<Form defaultValues={{ zip: '' }}>
				<MaskInput mask={zipcodeMask()} name="zip" />
				<FieldProbe name="zip" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'mask-input')

		const user = setupUser()

		await user.click(input)

		expect(getFieldProbe('zip')).toHaveAttribute('data-touched', 'false')

		await user.tab()

		expect(getFieldProbe('zip')).toHaveAttribute('data-touched', 'true')
	})
})
