import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../components/form'
import {
	PasswordConfirm,
	PasswordConfirmNew,
	PasswordConfirmRepeat,
} from '../../components/password-confirm'
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

describe('PasswordConfirmRepeat', () => {
	it('records the value when the caller onChange prevents the default', () => {
		// CONVENTIONS.md §3.9: the caller's handler runs first, and its
		// preventDefault() cannot keep the value from the mismatch coordinator.
		const onChange = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())

		renderUI(
			<PasswordConfirm>
				<PasswordConfirmNew name="password" />
				<PasswordConfirmRepeat name="confirm" onChange={onChange} />
			</PasswordConfirm>,
		)

		const { confirm } = enter('abc', 'abcd')

		expect(onChange).toHaveBeenCalledOnce()

		expect(confirm).toHaveAttribute('data-warning')
	})

	it('applies data-warning when passwords differ and the confirm was last edited', () => {
		renderUI(
			<PasswordConfirm>
				<PasswordConfirmNew name="password" />
				<PasswordConfirmRepeat name="confirm" />
			</PasswordConfirm>,
		)

		const { confirm } = enter('abc', 'abcd')

		expect(confirm).toHaveAttribute('data-warning')
	})

	it('describes the confirm input by the warning while the mismatch holds', () => {
		renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordConfirmNew name="password" />
				<PasswordConfirmRepeat name="confirm" />
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
				<PasswordConfirmNew name="password" />
				<PasswordConfirmRepeat name="confirm" />
			</PasswordConfirm>,
		)

		enter('abc', 'abcd')

		expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

		// Unmounting the confirm field clears the stale confirm value/name;
		// the warning must not keep reporting a mismatch against nothing.
		rerender(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordConfirmNew name="password" />
			</PasswordConfirm>,
		)

		expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
	})
})

describe('PasswordConfirm warning rendering', () => {
	it('keeps the live region mounted so the warning changes its children', () => {
		renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordConfirmNew name="password" />
				<PasswordConfirmRepeat name="confirm" />
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
				<PasswordConfirmNew name="password" />
				<PasswordConfirmRepeat name="confirm" />
			</PasswordConfirm>,
		)

		enter('abc', confirm)

		expect(onMatchChange).toHaveBeenCalledWith(expected)
	})

	it.each([
		['a partial value', 'ab'],
		['an empty value', ''],
	])('calls onMatchChange with false when the confirm field goes back to %s', (_name, confirm) => {
		const onMatchChange = vi.fn()

		renderUI(
			<PasswordConfirm onMatchChange={onMatchChange}>
				<PasswordConfirmNew name="password" />
				<PasswordConfirmRepeat name="confirm" />
			</PasswordConfirm>,
		)

		const inputs = enter('abc', 'abc')

		expect(onMatchChange).toHaveBeenLastCalledWith(true)

		fireEvent.change(inputs.confirm, { target: { value: confirm } })

		expect(onMatchChange).toHaveBeenLastCalledWith(false)

		expect(onMatchChange).toHaveBeenCalledTimes(2)
	})
})

describe('PasswordConfirm values', () => {
	it('clears the warning when the form resets', async () => {
		renderUI(
			<Form defaultValues={{ password: '', confirm: '' }}>
				<PasswordConfirm warning="Passwords do not match">
					<PasswordConfirmNew name="password" />
					<PasswordConfirmRepeat name="confirm" />
				</PasswordConfirm>
				<button type="reset">Reset</button>
			</Form>,
		)

		enter('abc', 'abd')

		expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

		await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Reset' })))

		expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
	})

	it('compares seeded form values without a keystroke', () => {
		const onMatchChange = vi.fn()

		renderUI(
			<Form defaultValues={{ password: 'abc', confirm: 'abd' }}>
				<PasswordConfirm warning="Passwords do not match" onMatchChange={onMatchChange}>
					<PasswordConfirmNew name="password" />
					<PasswordConfirmRepeat name="confirm" />
				</PasswordConfirm>
			</Form>,
		)

		expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

		expect(onMatchChange).toHaveBeenCalledWith(false)
	})

	it('compares controlled values and their updates', () => {
		const { rerender } = renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordConfirmNew value="abc" onChange={() => {}} />
				<PasswordConfirmRepeat value="abd" onChange={() => {}} />
			</PasswordConfirm>,
		)

		expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

		rerender(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordConfirmNew value="abc" onChange={() => {}} />
				<PasswordConfirmRepeat value="abc" onChange={() => {}} />
			</PasswordConfirm>,
		)

		expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
	})

	it('compares seeded default values', () => {
		renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<PasswordConfirmNew defaultValue="abc" />
				<PasswordConfirmRepeat defaultValue="abd" />
			</PasswordConfirm>,
		)

		expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
	})

	it('reads the reverted value after a native form reset', async () => {
		renderUI(
			<form>
				<PasswordConfirm warning="Passwords do not match">
					<PasswordConfirmNew />
					<PasswordConfirmRepeat />
				</PasswordConfirm>
				<button type="reset">Reset</button>
			</form>,
		)

		enter('abc', 'abd')

		expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		// The browser reverts the inputs after the event; the parts read them on
		// the next frame.
		await act(() => new Promise(requestAnimationFrame))

		expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
	})

	it('ignores other inputs inside the coordinator', () => {
		renderUI(
			<PasswordConfirm warning="Passwords do not match">
				<input aria-label="Username" />
				<input type="checkbox" aria-label="Remember me" />
				<PasswordConfirmNew />
				<PasswordConfirmRepeat />
			</PasswordConfirm>,
		)

		enter('abc', 'abc')

		fireEvent.input(screen.getByLabelText('Username'), { target: { value: 'charlie' } })

		fireEvent.click(screen.getByLabelText('Remember me'))

		expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
	})
})
