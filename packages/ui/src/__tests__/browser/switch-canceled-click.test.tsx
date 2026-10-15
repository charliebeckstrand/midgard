import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Form } from '../../components/form'
import { Switch } from '../../components/switch'
import { getSlot, renderUI } from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

/**
 * A click that an `onClick` cancels does not change a Switch. React reads the toggle before the
 * browser restores the input, and sends a change that does not occur. The file runs in the real
 * browser, because jsdom restores a canceled checkbox with a second toggle. The browser restores
 * the value that the input had before the click.
 */
describe('Switch canceled click (real browser)', () => {
	it('keeps its state on a canceled click, and reports the next click', async () => {
		const onChange = vi.fn()

		const { container, rerender } = renderUI(
			<Switch
				aria-label="Notify"
				onChange={onChange}
				onClick={(event) => event.preventDefault()}
			/>,
		)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		await userEvent.click(input)

		expect(input.checked).toBe(false)

		expect(input).toHaveAttribute('aria-checked', 'false')

		expect(onChange).not.toHaveBeenCalled()

		rerender(<Switch aria-label="Notify" onChange={onChange} />)

		await userEvent.click(input)

		expect(input.checked).toBe(true)

		expect(input).toHaveAttribute('aria-checked', 'true')

		expect(onChange).toHaveBeenCalledOnce()
	})

	it('keeps a bound field unchanged on a canceled click', async () => {
		const { container } = renderUI(
			<Form defaultValues={{ dark: false }}>
				<Switch aria-label="Dark" name="dark" onClick={(event) => event.preventDefault()} />
				<FieldProbe name="dark" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		await userEvent.click(input)

		expect(input.checked).toBe(false)

		expect(input).toHaveAttribute('aria-checked', 'false')

		expect(getFieldProbe('dark').textContent).toBe('false')
	})
})
