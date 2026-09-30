import { describe, expect, it, vi } from 'vitest'
import { Control } from '../../components/control'
import { PasswordInput } from '../../components/password-input'
import { bySlot, renderUI, screen, setupUser } from '../helpers'

describe('PasswordInput', () => {
	it('renders an input with type password by default', () => {
		const { container } = renderUI(<PasswordInput />)

		const input = bySlot(container, 'password-input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('type', 'password')
	})

	it('reveals the value from a pressed-state toggle with a fixed name', async () => {
		const { container } = renderUI(<PasswordInput />)

		const user = setupUser()

		const toggle = screen.getByRole('button', { name: 'Show password' })

		// APG toggle pattern: aria-pressed conveys the state while the
		// accessible name stays fixed.
		expect(toggle).toHaveAttribute('aria-pressed', 'false')

		await user.click(toggle)

		expect(bySlot(container, 'password-input')).toHaveAttribute('type', 'text')

		expect(toggle).toHaveAttribute('aria-pressed', 'true')

		expect(toggle).toHaveAccessibleName('Show password')
	})

	it('disables the toggle when the input is disabled', () => {
		renderUI(<PasswordInput disabled />)

		expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled()
	})

	it('disables the toggle when disabled comes from Control context', () => {
		renderUI(
			<Control disabled>
				<PasswordInput />
			</Control>,
		)

		expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled()
	})

	it('keeps the toggle enabled when the input is read-only', async () => {
		const { container } = renderUI(<PasswordInput readOnly />)

		const user = setupUser()

		const toggle = screen.getByRole('button', { name: 'Show password' })

		expect(toggle).toBeEnabled()

		// readOnly means viewable-but-not-editable; revealing still works.
		await user.click(toggle)

		expect(bySlot(container, 'password-input')).toHaveAttribute('type', 'text')
	})

	it('re-masks a revealed value while disabled and restores it on re-enable', async () => {
		const { container, rerender } = renderUI(<PasswordInput />)

		const user = setupUser()

		await user.click(screen.getByRole('button', { name: 'Show password' }))

		expect(bySlot(container, 'password-input')).toHaveAttribute('type', 'text')

		rerender(<PasswordInput disabled />)

		const input = bySlot(container, 'password-input')

		expect(input).toHaveAttribute('type', 'password')

		expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)

		rerender(<PasswordInput />)

		expect(bySlot(container, 'password-input')).toHaveAttribute('type', 'text')
	})
})

describe('PasswordInput onVisibleChange', () => {
	it('reports the reveal and the re-mask from the suffix toggle', async () => {
		const user = setupUser()

		const onVisibleChange = vi.fn()

		renderUI(<PasswordInput onVisibleChange={onVisibleChange} />)

		// A masked field is the rest state, not a transition.
		expect(onVisibleChange).not.toHaveBeenCalled()

		const toggle = screen.getByRole('button', { name: 'Show password' })

		await user.click(toggle)

		expect(onVisibleChange).toHaveBeenCalledExactlyOnceWith(true)

		await user.click(toggle)

		expect(onVisibleChange).toHaveBeenLastCalledWith(false)

		expect(onVisibleChange).toHaveBeenCalledTimes(2)
	})

	// The field re-masks when it goes out of play, and the report follows what is
	// actually on screen rather than the toggle's own flag.
	it('reports the re-mask when the field becomes disabled while revealed', async () => {
		const user = setupUser()

		const onVisibleChange = vi.fn()

		const { rerender } = renderUI(<PasswordInput onVisibleChange={onVisibleChange} />)

		await user.click(screen.getByRole('button', { name: 'Show password' }))

		expect(onVisibleChange).toHaveBeenLastCalledWith(true)

		rerender(<PasswordInput disabled onVisibleChange={onVisibleChange} />)

		expect(onVisibleChange).toHaveBeenLastCalledWith(false)
	})

	// Nothing can flip the reveal without the toggle, so the absent button is the
	// whole of it; the mount silence is asserted by the first case above.
	it('renders no toggle to report from when suppressed', () => {
		renderUI(<PasswordInput showToggle={false} />)

		expect(screen.queryByRole('button', { name: 'Show password' })).not.toBeInTheDocument()
	})
})
