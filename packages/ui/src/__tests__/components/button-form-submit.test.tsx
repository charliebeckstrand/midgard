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

	it.each<[string, React.ReactNode, string[]]>([
		['NumberInput steppers', <NumberInput key="n" defaultValue={1} />, ['Increase', 'Decrease']],
		['PasswordInput reveal toggle', <PasswordInput key="p" />, ['Show password']],
		[
			'SearchInput clear',
			<SearchInput key="s" value="query" onChange={() => {}} onClear={() => {}} />,
			['Clear search'],
		],
		[
			'ToggleIconButton',
			<ToggleIconButton key="t" pressed={false} icon={<Bold />} aria-label="Bold" />,
			['Bold'],
		],
		[
			'Alert dismiss',
			<Alert key="a" closable>
				Heads up
			</Alert>,
			['Dismiss'],
		],
	])('%s does not submit', (_name, control, buttons) => {
		const onSubmit = inForm(control)

		for (const name of buttons) fireEvent.click(screen.getByRole('button', { name }))

		expect(onSubmit).not.toHaveBeenCalled()
	})
})
