import { describe, expect, it, vi } from 'vitest'
import { Field, Label } from '../../components/fieldset'
import { SwitchChoice } from '../../components/switch'
import { Form } from '../../modules/form'
import { LocaleProvider } from '../../providers/locale'
import { act, bySlot, fireEvent, renderUI, screen, setupUser } from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

const MODES = [
	{ value: 'ltl', label: 'LTL' },
	{ value: 'tl', label: 'TL' },
] as const

function position(container: HTMLElement) {
	return bySlot(container, 'switch-choice-track')?.getAttribute('data-position')
}

describe('SwitchChoice', () => {
	it('renders a named radiogroup of three radios in the order of the track', () => {
		renderUI(<SwitchChoice aria-label="Freight" options={MODES} />)

		const group = screen.getByRole('radiogroup', { name: 'Freight' })

		const radios = screen.getAllByRole('radio')

		expect(group).toContainElement(radios[0] as HTMLElement)

		expect(radios).toHaveLength(3)

		expect(screen.getByRole('radio', { name: 'LTL' })).toBe(radios[0])

		expect(screen.getByRole('radio', { name: 'Off' })).toBe(radios[1])

		expect(screen.getByRole('radio', { name: 'TL' })).toBe(radios[2])
	})

	it('starts off, with the thumb in the middle', () => {
		const { container } = renderUI(<SwitchChoice aria-label="Freight" options={MODES} />)

		expect(screen.getByRole('radio', { name: 'Off' })).toBeChecked()

		expect(position(container)).toBe('center')
	})

	it('sets an option from a click on its label and reports it', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<SwitchChoice aria-label="Freight" options={MODES} onValueChange={onValueChange} />,
		)

		await user.click(screen.getByText('TL'))

		expect(screen.getByRole('radio', { name: 'TL' })).toBeChecked()

		expect(position(container)).toBe('end')

		expect(onValueChange).toHaveBeenLastCalledWith('tl')

		expect(bySlot(container, 'switch-choice-label')).not.toHaveAttribute('data-checked')
	})

	it('turns off from a click on the option that is on', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<SwitchChoice
				aria-label="Freight"
				options={MODES}
				defaultValue="ltl"
				onValueChange={onValueChange}
			/>,
		)

		expect(position(container)).toBe('start')

		await user.click(screen.getByText('LTL'))

		expect(screen.getByRole('radio', { name: 'Off' })).toBeChecked()

		expect(position(container)).toBe('center')

		expect(onValueChange).toHaveBeenLastCalledWith(null)
	})

	it('follows a controlled value, and null keeps it off', () => {
		const { container, rerender } = renderUI(
			<SwitchChoice aria-label="Freight" options={MODES} value="tl" onValueChange={() => {}} />,
		)

		expect(position(container)).toBe('end')

		rerender(
			<SwitchChoice aria-label="Freight" options={MODES} value={null} onValueChange={() => {}} />,
		)

		expect(position(container)).toBe('center')
	})

	it('keeps the position while read-only', async () => {
		const user = setupUser()

		const onValueChange = vi.fn()

		const { container } = renderUI(
			<SwitchChoice
				aria-label="Freight"
				options={MODES}
				defaultValue="ltl"
				readOnly
				onValueChange={onValueChange}
			/>,
		)

		expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-readonly', 'true')

		await user.click(screen.getByText('TL'))

		await user.click(screen.getByText('LTL'))

		expect(screen.getByRole('radio', { name: 'LTL' })).toBeChecked()

		expect(position(container)).toBe('start')

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('disables each radio', () => {
		renderUI(<SwitchChoice aria-label="Freight" options={MODES} disabled />)

		for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
	})

	it('binds to a Form field by name', async () => {
		const user = setupUser()

		renderUI(
			<Form defaultValues={{ mode: 'ltl' }}>
				<SwitchChoice aria-label="Freight" name="mode" options={MODES} />
				<FieldProbe name="mode" />
			</Form>,
		)

		expect(screen.getByRole('radio', { name: 'LTL' })).toBeChecked()

		await user.click(screen.getByText('TL'))

		expect(getFieldProbe('mode')).toHaveTextContent('tl')

		await user.click(screen.getByText('TL'))

		expect(getFieldProbe('mode')).toHaveTextContent('undefined')
	})

	it('goes back to defaultValue on a native form reset', async () => {
		const { container } = renderUI(
			<form>
				<SwitchChoice aria-label="Freight" options={MODES} defaultValue="ltl" />
				<button type="reset">Reset</button>
			</form>,
		)

		fireEvent.click(screen.getByRole('radio', { name: 'TL' }))

		expect(position(container)).toBe('end')

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		await act(() => new Promise(requestAnimationFrame))

		expect(position(container)).toBe('start')
	})

	it('names the group from an enclosing Field label', () => {
		renderUI(
			<Field>
				<Label as="span">Freight</Label>
				<SwitchChoice options={MODES} />
			</Field>,
		)

		expect(screen.getByRole('radiogroup', { name: 'Freight' })).toBeInTheDocument()
	})

	it('names the off position in the language of the locale', () => {
		renderUI(
			<LocaleProvider locale="es-ES">
				<SwitchChoice aria-label="Flete" options={MODES} />
			</LocaleProvider>,
		)

		expect(screen.getByRole('radio', { name: 'Desactivado' })).toBeInTheDocument()
	})
})
