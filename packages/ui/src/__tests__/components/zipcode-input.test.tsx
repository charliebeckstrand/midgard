import { type ComponentProps, createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form, useFormField } from '../../components/form'
import { ZipcodeInput } from '../../components/zipcode-input'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('ZipcodeInput', () => {
	it('renders an input with data-slot="zipcode-input" and a map-pin icon prefix by default', () => {
		const { container } = renderUI(<ZipcodeInput />)

		const input = bySlot(container, 'zipcode-input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')

		expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('renders a custom prefix in place of the default map-pin icon', () => {
		const { container } = renderUI(
			<ZipcodeInput prefix={<span data-testid="custom-prefix">ZIP</span>} />,
		)

		expect(container.querySelector('[data-testid="custom-prefix"]')).toBeInTheDocument()
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<ZipcodeInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('uses a country-appropriate default placeholder', () => {
		const { container } = renderUI(<ZipcodeInput country="CA" />)

		const input = bySlot(container, 'zipcode-input')

		expect(input).toHaveAttribute('placeholder', 'A1A 1A1')
	})

	it('allows overriding the placeholder', () => {
		const { container } = renderUI(<ZipcodeInput placeholder="ZIP code" />)

		const input = bySlot(container, 'zipcode-input')

		expect(input).toHaveAttribute('placeholder', 'ZIP code')
	})

	it('formats US ZIP+4 with a dash', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<ZipcodeInput onValueChange={onChange} />)

		const input = bySlot(container, 'zipcode-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '941031234')

		expect(input.value).toBe('94103-1234')

		expect(onChange).toHaveBeenLastCalledWith('94103-1234')
	})

	it('strips non-digit characters for US', async () => {
		const { container } = renderUI(<ZipcodeInput />)

		const input = bySlot(container, 'zipcode-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'abc94103xyz')

		expect(input.value).toBe('94103')
	})

	it('uppercases and spaces Canadian postal codes', async () => {
		const { container } = renderUI(<ZipcodeInput country="CA" />)

		const input = bySlot(container, 'zipcode-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'k1a0b1')

		expect(input.value).toBe('K1A 0B1')
	})

	it.each<[string, ComponentProps<typeof ZipcodeInput>, string]>([
		['formats defaultValue on initial render', { defaultValue: '941031234' }, '94103-1234'],
		[
			'uppercases GB postcodes while preserving an internal space',
			{ country: 'GB', defaultValue: 'sw1a 1aa' },
			'SW1A 1AA',
		],
		[
			'strips invalid characters and collapses whitespace for GB',
			{ country: 'GB', defaultValue: 'sw1a  1aa@@' },
			'SW1A 1AA',
		],
		[
			'caps GB postcodes at eight characters',
			{ country: 'GB', defaultValue: 'abcdefghijk' },
			'ABCDEFGH',
		],
		[
			'passes international codes through, truncated to twelve characters',
			{ country: 'international', defaultValue: 'abc-123 def/456' },
			'abc-123 def/',
		],
	])('%s', (_name, props, expected) => {
		const { container } = renderUI(<ZipcodeInput {...props} />)

		const input = bySlot(container, 'zipcode-input') as HTMLInputElement

		expect(input.value).toBe(expected)
	})

	it('uses an empty default placeholder for international codes', () => {
		const { container } = renderUI(<ZipcodeInput country="international" />)

		const input = bySlot(container, 'zipcode-input') as HTMLInputElement

		expect(input).toHaveAttribute('placeholder', '')

		expect(input).toHaveAttribute('inputmode', 'text')
	})

	it('disables the input when disabled', () => {
		const { container } = renderUI(<ZipcodeInput disabled />)

		const input = bySlot(container, 'zipcode-input')

		expect(input).toBeDisabled()
	})

	it('binds to a Form field by name, storing the formatted text', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ zip: '' }} onSubmit={onSubmit}>
				<ZipcodeInput name="zip" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const user = userEvent.setup()

		const input = bySlot(container, 'zipcode-input') as HTMLInputElement

		await user.type(input, '941031234')

		expect(input.value).toBe('94103-1234')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ zip: '94103-1234' }),
			expect.anything(),
		)
	})

	it('marks the form field touched on blur', async () => {
		function TouchedProbe() {
			const field = useFormField('zip')

			return <span data-testid="touched">{field?.touched ? 'touched' : 'untouched'}</span>
		}

		const { container } = renderUI(
			<Form defaultValues={{ zip: '' }}>
				<ZipcodeInput name="zip" />
				<TouchedProbe />
			</Form>,
		)

		const input = bySlot(container, 'zipcode-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.click(input)

		expect(screen.getByTestId('touched').textContent).toBe('untouched')

		await user.tab()

		expect(screen.getByTestId('touched').textContent).toBe('touched')
	})
})
