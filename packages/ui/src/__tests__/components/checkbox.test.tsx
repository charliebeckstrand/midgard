import { createRef, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Description, Label } from '../../components/fieldset'
import { Form } from '../../components/form'
import {
	act,
	bySlot,
	densityStepOf,
	fireEvent,
	getSlot,
	present,
	renderUI,
	screen,
	setupUser,
} from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

describe('Checkbox', () => {
	it('renders a checkbox input with data-slot="checkbox" and a check icon', () => {
		const { container } = renderUI(<Checkbox />)

		const input = bySlot(container, 'checkbox')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')

		expect(input).toHaveAttribute('type', 'checkbox')

		const check = bySlot(container, 'checkbox-check')

		expect(check).toBeInTheDocument()

		expect(check).toHaveAttribute('aria-hidden', 'true')
	})

	it('forwards checked and onChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(<Checkbox checked={true} onChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		expect(input.checked).toBe(true)

		fireEvent.click(input)

		expect(onChange).toHaveBeenCalled()
	})

	it('forwards a createRef to the input element', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<Checkbox ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('forwards a callback ref to the input element', () => {
		const refFn = vi.fn()

		renderUI(<Checkbox ref={refFn} />)

		expect(refFn).toHaveBeenCalledWith(expect.any(HTMLInputElement))
	})

	it('sets the indeterminate flag on the input element when indeterminate is true', () => {
		const { container } = renderUI(<Checkbox indeterminate />)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		expect(input.indeterminate).toBe(true)
	})

	it('keeps the indeterminate flag after an activation while the prop stays true', () => {
		const { container } = renderUI(<Checkbox indeterminate />)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		// The browser clears the property on activation; the prop did not change.
		fireEvent.click(input)

		expect(input.indeterminate).toBe(true)
	})
})

describe('Checkbox server render', () => {
	// A server render runs no layout effect, so the `indeterminate` property
	// stays false until hydration. The markup must carry the state itself.
	function serverInput(element: ReactElement) {
		const host = document.createElement('div')

		host.innerHTML = renderToString(element)

		return getSlot<HTMLInputElement>(host, 'checkbox')
	}

	it('writes the indeterminate state into the server HTML', () => {
		expect(serverInput(<Checkbox indeterminate />)).toHaveAttribute('data-indeterminate')
	})

	it('writes no indeterminate state when the prop is false', () => {
		expect(serverInput(<Checkbox />)).not.toHaveAttribute('data-indeterminate')
	})
})

describe('Checkbox in a Form', () => {
	it('binds checked to the form field by name and chains onChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ agree: false }}>
				<Checkbox name="agree" onChange={onChange} />
				<FieldProbe name="agree" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		expect(input.checked).toBe(false)

		fireEvent.click(input)

		expect(input.checked).toBe(true)

		expect(getFieldProbe('agree').textContent).toBe('true')

		expect(onChange).toHaveBeenCalled()
	})

	it('lets an explicit checked prop win over the form binding', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ agree: false }}>
				<Checkbox name="agree" checked onChange={onChange} />
				<FieldProbe name="agree" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		expect(input.checked).toBe(true)

		fireEvent.click(input)

		// The consumer's handler resolves; the store stays untouched.
		expect(getFieldProbe('agree').textContent).toBe('false')

		expect(onChange).toHaveBeenCalled()
	})
})

describe('CheckboxGroup', () => {
	it('requires an accessible name (compile-time)', () => {
		// Never rendered; exists for `tsc`. The group is `role="group"`, so a group
		// with no `aria-label` and no `aria-labelledby` must not typecheck.
		const typeChecks = () => (
			<>
				{/* @ts-expect-error: a checkbox group needs aria-label or aria-labelledby */}
				<CheckboxGroup>items</CheckboxGroup>

				<CheckboxGroup aria-labelledby="notifications-heading">items</CheckboxGroup>
			</>
		)

		expect(typeChecks).toBeTypeOf('function')
	})

	it('exposes role="group" and accepts an accessible name', () => {
		renderUI(<CheckboxGroup aria-label="Notifications">items</CheckboxGroup>)

		expect(screen.getByRole('group', { name: 'Notifications' })).toBeInTheDocument()
	})

	it('keeps the group role when a consumer supplies one', () => {
		renderUI(
			<CheckboxGroup aria-label="Notifications" role="presentation">
				items
			</CheckboxGroup>,
		)

		// §3.9: `role` is load-bearing, so the group semantics stay.
		expect(screen.getByRole('group', { name: 'Notifications' })).toBeInTheDocument()
	})
})

describe('Checkbox size', () => {
	it('opens a scope for an explicit size prop', () => {
		const { container } = renderUI(<Checkbox size="lg" />)

		expect(getSlot(container, 'control')).toHaveAttribute('data-density', 'lg')

		expect(densityStepOf(getSlot(container, 'checkbox-check'))).toBe('lg')
	})
})

describe('CheckboxField aria-describedby', () => {
	it('points the checkbox at a rendered Description', () => {
		const { container } = renderUI(
			<CheckboxField>
				<Checkbox />
				<Description>Subscribe to product updates.</Description>
			</CheckboxField>,
		)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		const description = getSlot(container, 'description')

		expect(description.id).toBeTruthy()

		expect(input).toHaveAttribute('aria-describedby', description.id)
	})
})

describe('Checkbox defaultChecked under a binding', () => {
	it('drops defaultChecked from a bound checkbox', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { container } = renderUI(
			<Form defaultValues={{ terms: false }}>
				<Checkbox name="terms" defaultChecked />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		expect(input.checked).toBe(false)

		expect(input.defaultChecked).toBe(false)

		const warned = error.mock.calls.some(([message]) =>
			String(message).includes('both checked and defaultChecked'),
		)

		expect(warned).toBe(false)

		error.mockRestore()
	})

	it('keeps defaultChecked on an unbound checkbox', () => {
		const { container } = renderUI(<Checkbox defaultChecked />)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		expect(input.checked).toBe(true)

		expect(input.defaultChecked).toBe(true)
	})
})

describe('Checkbox readOnly', () => {
	it('keeps its state on a click, a click on the box, and a Space press', async () => {
		const user = setupUser()

		const onChange = vi.fn()

		const { container } = renderUI(<Checkbox readOnly onChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		expect(input).toHaveAttribute('aria-readonly', 'true')

		await user.click(input)

		await user.click(getSlot(container, 'control'))

		await user.keyboard(' ')

		expect(input.checked).toBe(false)

		expect(onChange).not.toHaveBeenCalled()

		// Read-only is not disabled: the box keeps the focus.
		expect(input).toHaveFocus()
	})

	it('submits its value', () => {
		const { container } = renderUI(
			<form>
				<Checkbox name="agree" readOnly defaultChecked />
			</form>,
		)

		const form = present<HTMLFormElement>(container.querySelector('form'), 'form')

		expect(new FormData(form).get('agree')).toBe('on')
	})

	it('keeps a bound field unchanged', async () => {
		const user = setupUser()

		const { container } = renderUI(
			<Form defaultValues={{ agree: false }}>
				<Checkbox name="agree" readOnly />
				<FieldProbe name="agree" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		await user.click(input)

		expect(input.checked).toBe(false)

		expect(getFieldProbe('agree').textContent).toBe('false')
	})

	it('keeps the indeterminate flag', async () => {
		const user = setupUser()

		const { container } = renderUI(<Checkbox readOnly indeterminate />)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		await user.click(input)

		expect(input.checked).toBe(false)

		expect(input.indeterminate).toBe(true)
	})

	it('toggles and fires onChange again when readOnly turns off', async () => {
		const user = setupUser()

		const onChange = vi.fn()

		const { container, rerender } = renderUI(<Checkbox readOnly onChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'checkbox')

		await user.click(input)

		rerender(<Checkbox onChange={onChange} />)

		expect(input).not.toHaveAttribute('aria-readonly')

		await user.click(input)

		expect(input.checked).toBe(true)

		expect(onChange).toHaveBeenCalledOnce()
	})
})

describe('Checkbox presentational props', () => {
	it('sends style and hidden to the visible box', () => {
		const { container } = renderUI(<Checkbox hidden style={{ marginTop: '4px' }} />)

		const box = getSlot(container, 'control')

		const input = getSlot(container, 'checkbox')

		expect(box).toHaveAttribute('hidden')

		expect(box).toHaveStyle({ marginTop: '4px' })

		expect(input).not.toHaveAttribute('hidden')

		expect(input).not.toHaveAttribute('style')
	})
})

describe('Checkbox touch', () => {
	// When the page is zoomed in, iOS holds a tap for a possible double tap. A
	// second tap on a near row in that time joins the first, and neither toggles.
	it('stops the double-tap wait on the group, the row, and the checkbox', () => {
		const { container } = renderUI(
			<CheckboxGroup aria-label="Notifications">
				<CheckboxField>
					<Checkbox />
					<Label>Email</Label>
				</CheckboxField>
			</CheckboxGroup>,
		)

		expect(screen.getByRole('group')).toHaveClass('touch-manipulation')

		const field = getSlot(container, 'field')

		expect(field).toHaveClass('touch-manipulation')

		expect(getSlot(field, 'control')).toHaveClass('touch-manipulation')
	})
})

describe('Checkbox native form reset', () => {
	it('returns an uncontrolled checkbox to defaultChecked', async () => {
		const user = setupUser()

		renderUI(
			<form>
				<Checkbox aria-label="Terms" defaultChecked />
				<Checkbox aria-label="News" />
				<button type="reset">Reset</button>
			</form>,
		)

		await user.click(screen.getByRole('checkbox', { name: 'Terms' }))

		await user.click(screen.getByRole('checkbox', { name: 'News' }))

		await user.click(screen.getByRole('button', { name: 'Reset' }))

		await act(() => new Promise(requestAnimationFrame))

		expect(screen.getByRole('checkbox', { name: 'Terms' })).toBeChecked()

		expect(screen.getByRole('checkbox', { name: 'News' })).not.toBeChecked()
	})
})
