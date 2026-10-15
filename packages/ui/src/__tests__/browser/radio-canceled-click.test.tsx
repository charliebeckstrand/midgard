import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Radio } from '../../components/radio'
import { renderUI, screen } from '../helpers'

/**
 * A click that an `onClick` cancels does not check a Radio. React reads the check before the
 * browser restores the group, and sends a change that does not occur. The file runs in the real
 * browser, because jsdom does not check the old radio of the group again after a canceled click.
 */
describe('Radio canceled click (real browser)', () => {
	const renderPlans = (onChange: () => void, cancel: boolean) => (
		<div>
			<Radio aria-label="Starter" name="canceled-plan" value="starter" defaultChecked />
			<Radio
				aria-label="Business"
				name="canceled-plan"
				value="business"
				onChange={onChange}
				onClick={cancel ? (event) => event.preventDefault() : undefined}
			/>
		</div>
	)

	const radio = (name: string) => screen.getByRole<HTMLInputElement>('radio', { name })

	it('fires no onChange on a canceled click, and reports the next click', async () => {
		const onChange = vi.fn()

		const { rerender } = renderUI(renderPlans(onChange, true))

		await userEvent.click(radio('Business'))

		expect(radio('Business').checked).toBe(false)

		expect(radio('Starter').checked).toBe(true)

		expect(onChange).not.toHaveBeenCalled()

		rerender(renderPlans(onChange, false))

		await userEvent.click(radio('Business'))

		expect(radio('Business').checked).toBe(true)

		expect(onChange).toHaveBeenCalledOnce()
	})
})
