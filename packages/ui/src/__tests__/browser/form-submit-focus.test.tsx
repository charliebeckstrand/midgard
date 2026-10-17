import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Form, FormSubmit } from '../../modules/form'
import { deferred, getSlot, renderUI } from '../helpers'

/**
 * A submit locks the fields of its form, and disables nothing. Chromium moves
 * the focus of a control that becomes disabled to the body, and jsdom does
 * not. So this file runs in the real browser, where a disabled field or
 * button would lose the focus.
 */
describe('Form submit focus (real browser)', () => {
	function renderSignup(onSubmit: () => Promise<void>) {
		return renderUI(
			<Form defaultValues={{ email: 'jane@example.com' }} onSubmit={onSubmit}>
				<Field>
					<Label>Email</Label>
					<Input name="email" />
				</Field>
				<FormSubmit>Subscribe</FormSubmit>
			</Form>,
		)
	}

	it('keeps the focus on the submit button, and starts no second submit', async () => {
		const pending = deferred()

		const onSubmit = vi.fn(() => pending.promise)

		const { container } = renderSignup(onSubmit)

		const button = getSlot<HTMLButtonElement>(container, 'form-submit')

		const input = getSlot<HTMLInputElement>(container, 'input')

		button.focus()

		await userEvent.keyboard('{Enter}')

		await expect.poll(() => button.getAttribute('aria-busy')).toBe('true')

		expect(input.readOnly).toBe(true)

		expect(button.disabled).toBe(false)

		expect(document.activeElement).toBe(button)

		await userEvent.keyboard('{Enter}')

		expect(onSubmit).toHaveBeenCalledOnce()

		pending.resolve()

		await expect.poll(() => button.getAttribute('aria-busy')).toBeNull()

		expect(document.activeElement).toBe(button)
	})

	it('keeps the focus on a field that an Enter submits, and refuses a keystroke', async () => {
		const pending = deferred()

		const { container } = renderSignup(() => pending.promise)

		const button = getSlot<HTMLButtonElement>(container, 'form-submit')

		const input = getSlot<HTMLInputElement>(container, 'input')

		input.focus()

		await userEvent.keyboard('{Enter}')

		await expect.poll(() => button.getAttribute('aria-busy')).toBe('true')

		expect(input.readOnly).toBe(true)

		expect(input.disabled).toBe(false)

		expect(document.activeElement).toBe(input)

		await userEvent.keyboard('x')

		expect(input.value).toBe('jane@example.com')

		pending.resolve()

		await expect.poll(() => input.readOnly).toBe(false)

		expect(document.activeElement).toBe(input)
	})
})
