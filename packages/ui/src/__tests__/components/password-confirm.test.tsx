import { describe, expect, it, vi } from 'vitest'
import { Form, useFormActions } from '../../components/form'
import { Input } from '../../components/input'
import { PasswordConfirm, PasswordConfirmInput } from '../../components/password-confirm'
import { PasswordInput } from '../../components/password-input'
import { act, fireEvent, renderUI, screen } from '../helpers'

/** The password input and the confirm input, in document order. */
function passwordInputs() {
	const [password, confirm] = document.querySelectorAll<HTMLInputElement>('input[type="password"]')

	return { password: password as HTMLInputElement, confirm: confirm as HTMLInputElement }
}

/** Types `password` into the first field, then `confirm` into the confirm field. */
function enter(password: string, confirm: string) {
	const inputs = passwordInputs()

	fireEvent.input(inputs.password, { target: { value: password } })

	fireEvent.change(inputs.confirm, { target: { value: confirm } })

	return inputs
}

describe('PasswordConfirmInput', () => {
	it('records the value when the caller onChange prevents the default', () => {
		// CONVENTIONS.md §3.9: the caller's handler runs first, and its
		// preventDefault() cannot keep the value from the mismatch coordinator.
		const onChange = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())

		renderUI(
			<PasswordConfirm>
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" onChange={onChange} />
			</PasswordConfirm>,
		)

		const { confirm } = enter('abc', 'abcd')

		expect(onChange).toHaveBeenCalledOnce()

		expect(confirm).toHaveAttribute('data-warning')
	})

	it('applies data-warning when passwords differ and the confirm was last edited', () => {
		renderUI(
			<PasswordConfirm>
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		const { confirm } = enter('abc', 'abcd')

		expect(confirm).toHaveAttribute('data-warning')
	})

	it('describes the confirm input by the warning while the mismatch holds', () => {
		renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		const { confirm } = enter('abc', 'abcd')

		// The warning id joins the input's aria-describedby, so focusing the
		// invalid field announces the reason, not a bare "invalid".
		const describedBy = confirm.getAttribute('aria-describedby')

		expect(describedBy).toBeTruthy()

		const warning = document.getElementById((describedBy as string).split(' ').at(-1) as string)

		expect(warning).toHaveTextContent('Passwords do not match')

		// Matching again drops both the warning and the reference.
		fireEvent.change(confirm, { target: { value: 'abc' } })

		expect(confirm).not.toHaveAttribute('aria-describedby')
	})

	it('resets the coordinator when the confirm input unmounts', () => {
		const { rerender } = renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		enter('abc', 'abcd')

		expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

		// Unmounting the confirm field clears the stale confirm value/name;
		// the warning must not keep reporting a mismatch against nothing.
		rerender(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordInput name="password" />
			</PasswordConfirm>,
		)

		expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
	})
})

describe('PasswordConfirm warning rendering', () => {
	it('keeps the live region mounted so the warning changes its children', () => {
		renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		// The region is in the tree before it holds text. A live region that enters
		// the DOM together with its content does not announce.
		const region = screen.getByRole('status')

		expect(region).toBeEmptyDOMElement()

		enter('abc', 'abcd')

		// The same element, with new children: that change is what announces.
		expect(screen.getByRole('status')).toBe(region)

		expect(region).toHaveTextContent('Passwords do not match')
	})

	it.each([
		['true when passwords match', 'abc', true],
		['false when passwords diverge', 'abd', false],
	])('calls onMatchChange with %s', (_name, confirm, expected) => {
		const onMatchChange = vi.fn()

		renderUI(
			<PasswordConfirm onMatchChange={onMatchChange}>
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		enter('abc', confirm)

		expect(onMatchChange).toHaveBeenCalledWith(expected)
	})
})

describe('PasswordConfirm field discovery', () => {
	it('does not record another input as the password', () => {
		renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<Input name="username" aria-label="Username" />
				<PasswordInput name="password" />
				<PasswordConfirmInput name="confirm" />
			</PasswordConfirm>,
		)

		const { confirm } = enter('abc', 'abc')

		// A later edit of the username must not replace the password value.
		fireEvent.input(screen.getByRole('textbox', { name: 'Username' }), {
			target: { value: 'alice' },
		})

		expect(confirm).not.toHaveAttribute('data-warning')

		expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
	})

	it('reads seeded values with no typed input', () => {
		const onMatchChange = vi.fn()

		renderUI(
			<PasswordConfirm warning="Passwords do not match" onMatchChange={onMatchChange}>
				<PasswordInput name="password" defaultValue="abc" />
				<PasswordConfirmInput name="confirm" defaultValue="abd" />
			</PasswordConfirm>,
		)

		expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

		expect(onMatchChange).toHaveBeenCalledWith(false)
	})

	it('follows a programmatic form reset', () => {
		function ResetButton() {
			const actions = useFormActions()

			return (
				<button type="button" onClick={() => actions?.reset()}>
					Reset
				</button>
			)
		}

		renderUI(
			<Form defaultValues={{ password: '', confirm: '' }}>
				<PasswordConfirm warning="Passwords do not match">
					<PasswordInput name="password" />
					<PasswordConfirmInput name="confirm" />
				</PasswordConfirm>
				<ResetButton />
			</Form>,
		)

		enter('abc', 'abcd')

		expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
		})

		expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
	})
})
