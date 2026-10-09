import { describe, expect, it, vi } from 'vitest'
import { Description } from '../../components/fieldset'
import { Form } from '../../components/form'
import { Switch, SwitchField } from '../../components/switch'
import { act, bySlot, fireEvent, getSlot, present, renderUI, screen, setupUser } from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

describe('Switch', () => {
	it('keeps the switch role and synced aria-checked over consumer props', () => {
		const { container } = renderUI(<Switch checked onChange={() => {}} role="checkbox" />)

		const input = present<HTMLInputElement>(container.querySelector('input'), 'input')

		// Internal wiring wins over a consumer spread.
		expect(input).toHaveAttribute('role', 'switch')

		expect(input).toHaveAttribute('aria-checked', 'true')
	})

	it('renders a checkbox input with data-slot="switch" and a thumb element', () => {
		const { container } = renderUI(<Switch />)

		const input = bySlot(container, 'switch')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')

		expect(input).toHaveAttribute('type', 'checkbox')

		const thumb = bySlot(container, 'switch-thumb')

		expect(thumb).toBeInTheDocument()

		expect(thumb).toHaveAttribute('aria-hidden', 'true')
	})

	it('mirrors a native form reset into aria-checked', async () => {
		renderUI(
			<form>
				<Switch aria-label="Notify" />
				<button type="reset">Reset</button>
			</form>,
		)

		const input = screen.getByRole('switch', { name: 'Notify' })

		fireEvent.click(input)

		expect(input).toHaveAttribute('aria-checked', 'true')

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		// The browser reverts the input after the event, and the switch reads it
		// on the next frame.
		await act(() => new Promise(requestAnimationFrame))

		expect(input).not.toBeChecked()

		expect(input).toHaveAttribute('aria-checked', 'false')
	})

	it('forwards checked and onChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(<Switch checked={true} onChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		expect(input.checked).toBe(true)

		fireEvent.click(input)

		expect(onChange).toHaveBeenCalled()
	})
})

describe('Switch in a Form', () => {
	it('binds checked to the form field by name and chains onChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ dark: false }}>
				<Switch name="dark" onChange={onChange} />
				<FieldProbe name="dark" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		expect(input.checked).toBe(false)

		fireEvent.click(input)

		expect(input.checked).toBe(true)

		expect(input).toHaveAttribute('aria-checked', 'true')

		expect(getFieldProbe('dark').textContent).toBe('true')

		expect(onChange).toHaveBeenCalled()
	})

	it('lets an explicit checked prop win over the form binding', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ dark: false }}>
				<Switch name="dark" checked onChange={onChange} />
				<FieldProbe name="dark" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		expect(input.checked).toBe(true)

		fireEvent.click(input)

		// The consumer's handler resolves; the store stays untouched.
		expect(getFieldProbe('dark').textContent).toBe('false')

		expect(onChange).toHaveBeenCalled()
	})
})

describe('Switch readOnly', () => {
	it('keeps its state on a click, a click on the track, and a Space press', async () => {
		const user = setupUser()

		const onChange = vi.fn()

		const { container } = renderUI(<Switch readOnly onChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		expect(input).toHaveAttribute('aria-readonly', 'true')

		await user.click(input)

		await user.click(getSlot(container, 'control'))

		await user.keyboard(' ')

		expect(input.checked).toBe(false)

		expect(input).toHaveAttribute('aria-checked', 'false')

		expect(onChange).not.toHaveBeenCalled()

		// Read-only is not disabled: the switch keeps the focus.
		expect(input).toHaveFocus()
	})

	it('submits its value', () => {
		const { container } = renderUI(
			<form>
				<Switch name="dark" readOnly defaultChecked />
			</form>,
		)

		const form = present<HTMLFormElement>(container.querySelector('form'), 'form')

		expect(new FormData(form).get('dark')).toBe('on')
	})

	it('keeps a bound field unchanged', async () => {
		const user = setupUser()

		const { container } = renderUI(
			<Form defaultValues={{ dark: false }}>
				<Switch name="dark" readOnly />
				<FieldProbe name="dark" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		await user.click(input)

		expect(input.checked).toBe(false)

		expect(getFieldProbe('dark').textContent).toBe('false')
	})

	it('toggles and fires onChange again when readOnly turns off', async () => {
		const user = setupUser()

		const onChange = vi.fn()

		const { container, rerender } = renderUI(<Switch readOnly onChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		await user.click(input)

		rerender(<Switch onChange={onChange} />)

		expect(input).not.toHaveAttribute('aria-readonly')

		await user.click(input)

		expect(input.checked).toBe(true)

		expect(input).toHaveAttribute('aria-checked', 'true')

		expect(onChange).toHaveBeenCalledOnce()
	})
})

describe('Switch presentational props', () => {
	it('sends style and hidden to the visible track', () => {
		const { container } = renderUI(<Switch hidden style={{ marginTop: '4px' }} />)

		const track = getSlot(container, 'control')

		const input = getSlot(container, 'switch')

		expect(track).toHaveAttribute('hidden')

		expect(track).toHaveStyle({ marginTop: '4px' })

		expect(input).not.toHaveAttribute('hidden')

		expect(input).not.toHaveAttribute('style')
	})
})

describe('SwitchField aria-describedby', () => {
	it('points the switch at a rendered Description', () => {
		const { container } = renderUI(
			<SwitchField>
				<Switch />
				<Description>Enable dark mode.</Description>
			</SwitchField>,
		)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		const description = getSlot(container, 'description')

		expect(description.id).toBeTruthy()

		expect(input).toHaveAttribute('aria-describedby', description.id)
	})
})
