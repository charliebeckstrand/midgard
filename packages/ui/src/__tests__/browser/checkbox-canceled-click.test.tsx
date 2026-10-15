import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Checkbox } from '../../components/checkbox'
import { Form } from '../../components/form'
import { getSlot, renderUI } from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

/**
 * A click that an `onClick` cancels does not change a Checkbox. React reads the toggle before the
 * browser restores the input, and sends a change that does not occur. The file runs in the real
 * browser, because jsdom restores a canceled checkbox with a second toggle. The browser restores
 * the value that the input had before the click.
 */
describe('Checkbox canceled click (real browser)', () => {
	it('fires no onChange on a canceled click, and reports the next click', async () => {
		const onChange = vi.fn()

		const { container, rerender } = renderUI(
			<Checkbox
				aria-label="Agree"
				onChange={onChange}
				onClick={(event) => event.preventDefault()}
			/>,
		)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		await userEvent.click(input)

		expect(input.checked).toBe(false)

		expect(onChange).not.toHaveBeenCalled()

		rerender(<Checkbox aria-label="Agree" onChange={onChange} />)

		await userEvent.click(input)

		expect(input.checked).toBe(true)

		expect(onChange).toHaveBeenCalledOnce()
	})

	it('keeps a bound field unchanged on a canceled click', async () => {
		const { container } = renderUI(
			<Form defaultValues={{ agree: false }}>
				<Checkbox aria-label="Agree" name="agree" onClick={(event) => event.preventDefault()} />
				<FieldProbe name="agree" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		await userEvent.click(input)

		expect(input.checked).toBe(false)

		expect(getFieldProbe('agree').textContent).toBe('false')
	})

	it('keeps the indeterminate state on a canceled click', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Checkbox
				aria-label="All"
				indeterminate
				onChange={onChange}
				onClick={(event) => event.preventDefault()}
			/>,
		)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		await userEvent.click(input)

		expect(input.checked).toBe(false)

		expect(input.indeterminate).toBe(true)

		expect(onChange).not.toHaveBeenCalled()
	})
})
