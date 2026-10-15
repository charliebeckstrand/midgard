import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Combobox, ComboboxOption } from '../../components/combobox'
import { CurrencyInput } from '../../components/currency-input'
import { DateInput } from '../../components/date-input'
import { SearchInput } from '../../components/search-input'
import { Slider } from '../../components/slider'
import { TagInput } from '../../components/tag-input'
import { act, fireEvent, frame, getSlot, noop, renderUI, screen, setupUser } from '../helpers'

// Each control below gives React a controlled value, so a native reset of its
// `<form>` restores the last value that React wrote. The `resetRef` of
// `useFormValue` sets the uncontrolled value back to `defaultValue` instead.

function renderInForm(control: ReactElement) {
	return renderUI(
		<form>
			{control}
			<button type="reset">Reset form</button>
		</form>,
	)
}

async function resetForm() {
	fireEvent.click(screen.getByRole('button', { name: 'Reset form' }))

	await act(frame)
}

describe('native form reset of an uncontrolled control', () => {
	it('sets a Slider back to defaultValue', async () => {
		const onValueChange = vi.fn()

		renderInForm(<Slider aria-label="Level" defaultValue={20} onValueChange={onValueChange} />)

		const input = screen.getByRole('slider') as HTMLInputElement

		fireEvent.change(input, { target: { value: '60' } })

		expect(input.value).toBe('60')

		await resetForm()

		expect(input.value).toBe('20')

		expect(onValueChange).toHaveBeenLastCalledWith(20)
	})

	it('sets a SearchInput back to defaultValue', async () => {
		renderInForm(<SearchInput aria-label="Search" defaultValue="cat" />)

		const input = screen.getByRole('searchbox') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'catalog' } })

		await resetForm()

		expect(input.value).toBe('cat')
	})

	it('sets a CurrencyInput back to defaultValue', async () => {
		renderInForm(<CurrencyInput aria-label="Price" defaultValue={5} />)

		const input = screen.getByRole('textbox') as HTMLInputElement

		const seeded = input.value

		fireEvent.change(input, { target: { value: '9' } })

		fireEvent.blur(input)

		expect(input.value).not.toBe(seeded)

		await resetForm()

		expect(input.value).toBe(seeded)
	})

	it('ends a CurrencyInput entry that a reset to the same amount leaves', async () => {
		renderInForm(<CurrencyInput aria-label="Price" defaultValue={5} />)

		const input = screen.getByRole('textbox') as HTMLInputElement

		const seeded = input.value

		fireEvent.focus(input)

		fireEvent.change(input, { target: { value: '5.0' } })

		await resetForm()

		expect(input.value).toBe(seeded)
	})

	it('sets a DateInput back to defaultValue and drops a typed entry', async () => {
		renderInForm(<DateInput aria-label="Date" defaultValue={new Date(2024, 0, 15)} />)

		const input = screen.getByRole('textbox') as HTMLInputElement

		const seeded = input.value

		fireEvent.change(input, { target: { value: '02/0' } })

		await resetForm()

		expect(input.value).toBe(seeded)

		expect(input).not.toHaveAttribute('aria-invalid', 'true')
	})

	it('sets a TagInput back to defaultValue and drops the draft', async () => {
		renderInForm(<TagInput aria-label="Tags" defaultValue={['react']} />)

		const input = screen.getByRole('textbox') as HTMLInputElement

		const user = setupUser()

		await user.type(input, 'vue{Enter}')

		await user.type(input, 'draft')

		expect(screen.getByText('vue')).toBeInTheDocument()

		await resetForm()

		expect(screen.queryByText('vue')).not.toBeInTheDocument()

		expect(screen.getByText('react')).toBeInTheDocument()

		expect(input.value).toBe('')
	})

	it('sets a Combobox back to defaultValue', async () => {
		const { container } = renderInForm(
			<Combobox<string> clearable defaultValue="v1" displayValue={(v) => v}>
				<ComboboxOption value="v1">One</ComboboxOption>
			</Combobox>,
		)

		const input = getSlot<HTMLInputElement>(container, 'combobox-input')

		const seeded = input.value

		expect(seeded).not.toBe('')

		fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))

		expect(input.value).toBe('')

		await resetForm()

		expect(input.value).toBe(seeded)
	})

	it('leaves a controlled control to its owner', async () => {
		renderInForm(<SearchInput aria-label="Search" value="held" onValueChange={noop} />)

		await resetForm()

		expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('held')
	})
})
