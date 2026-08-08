import { Bold } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from '../../components/alert'
import { Button } from '../../components/button'
import { NumberInput } from '../../components/number-input'
import { PasswordInput } from '../../components/password-input'
import { SearchInput } from '../../components/search-input'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import { fireEvent, renderUI, screen } from '../helpers'

// Button mirrors native <button>: a typeless button defaults to type="submit"
// and submits its enclosing form. Every internal control the library renders
// (steppers, clear/toggle adornments, dismiss buttons) must therefore opt out
// with type="button", or it would submit whatever form it is dropped into.

/** Renders `control` inside a form and returns the submit spy. */
function inForm(control: React.ReactNode) {
	const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())

	renderUI(<form onSubmit={onSubmit}>{control}</form>)

	return onSubmit
}

describe('form submission semantics', () => {
	it('a typeless Button submits its enclosing form', () => {
		const onSubmit = inForm(<Button>Save</Button>)

		fireEvent.click(screen.getByRole('button', { name: 'Save' }))

		expect(onSubmit).toHaveBeenCalledOnce()
	})

	it('an explicit type="button" does not submit', () => {
		const onSubmit = inForm(<Button type="button">Action</Button>)

		fireEvent.click(screen.getByRole('button', { name: 'Action' }))

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('NumberInput steppers do not submit', () => {
		const onSubmit = inForm(<NumberInput defaultValue={1} />)

		fireEvent.click(screen.getByRole('button', { name: 'Increase' }))

		fireEvent.click(screen.getByRole('button', { name: 'Decrease' }))

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('PasswordInput reveal toggle does not submit', () => {
		const onSubmit = inForm(<PasswordInput />)

		fireEvent.click(screen.getByRole('button', { name: 'Show password' }))

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('SearchInput clear does not submit', () => {
		const onSubmit = inForm(<SearchInput value="query" onChange={() => {}} onClear={() => {}} />)

		fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('ToggleIconButton does not submit', () => {
		const onSubmit = inForm(<ToggleIconButton pressed={false} icon={<Bold />} aria-label="Bold" />)

		fireEvent.click(screen.getByRole('button', { name: 'Bold' }))

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('Alert dismiss does not submit', () => {
		const onSubmit = inForm(<Alert closable>Heads up</Alert>)

		fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

		expect(onSubmit).not.toHaveBeenCalled()
	})
})
