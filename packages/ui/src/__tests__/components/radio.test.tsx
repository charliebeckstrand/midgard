import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Description, Label } from '../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
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

describe('Radio', () => {
	it('renders a radio input with data-slot="radio"', () => {
		const { container } = renderUI(<Radio />)

		const el = getSlot<HTMLInputElement>(container, 'radio')

		expect(el.tagName).toBe('INPUT')

		expect(el.type).toBe('radio')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Radio name="choice" value="a" />)

		const el = getSlot<HTMLInputElement>(container, 'radio')

		expect(el.name).toBe('choice')

		expect(el.value).toBe('a')
	})

	it('marks the control wrapper with data-disabled when disabled', () => {
		const { container } = renderUI(<Radio disabled />)

		const wrapper = bySlot(container, 'control')

		expect(wrapper).toHaveAttribute('data-disabled')
	})
})

describe('RadioGroup', () => {
	it('renders with role="radiogroup" and forwards the required name', () => {
		renderUI(<RadioGroup aria-label="Plan">content</RadioGroup>)

		expect(screen.getByRole('radiogroup')).toBeInTheDocument()

		expect(screen.getByRole('radiogroup')).toHaveAccessibleName('Plan')
	})

	it('keeps the radiogroup role when a consumer supplies one', () => {
		renderUI(
			<RadioGroup aria-label="Plan" role="group">
				content
			</RadioGroup>,
		)

		// §3.9: `role` is load-bearing, so the radiogroup semantics stay.
		expect(screen.getByRole('radiogroup')).toBeInTheDocument()
	})
})

const PLANS = ['starter', 'business', 'enterprise'] as const

/**
 * A group that holds its value in state, as a Form field does. React then puts
 * the checked radio back after a blocked click, which jsdom does not do for an
 * uncontrolled group.
 */
function Plans({ readOnly, onChange }: { readOnly?: boolean; onChange?: (plan: string) => void }) {
	const [value, setValue] = useState<string>('starter')

	return (
		<form>
			<RadioGroup aria-label="Plan" readOnly={readOnly}>
				{PLANS.map((name) => (
					<RadioField key={name}>
						<Radio
							name="plan"
							value={name}
							checked={value === name}
							onChange={() => {
								setValue(name)

								onChange?.(name)
							}}
						/>
						<Label>{name}</Label>
					</RadioField>
				))}
			</RadioGroup>
		</form>
	)
}

function plan(name: string): HTMLInputElement {
	return present(
		document.querySelector<HTMLInputElement>(`input[value="${name}"]`),
		`radio ${name}`,
	)
}

function checkedPlans(): string[] {
	return PLANS.filter((name) => plan(name).checked)
}

describe('RadioGroup readOnly', () => {
	it('sets aria-readonly on the group and not on the radios', () => {
		renderUI(<Plans readOnly />)

		expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-readonly', 'true')

		// ARIA defines aria-readonly on a radiogroup, not on a radio.
		expect(plan('business')).not.toHaveAttribute('aria-readonly')
	})

	it('sets no aria-readonly while it is not read-only', () => {
		renderUI(<Plans />)

		expect(screen.getByRole('radiogroup')).not.toHaveAttribute('aria-readonly')
	})

	it('keeps the selection on a click, a click on the label, and a Space press', async () => {
		const user = setupUser()

		const onChange = vi.fn()

		renderUI(<Plans readOnly onChange={onChange} />)

		await user.click(plan('business'))

		await user.click(screen.getByText('enterprise'))

		await user.click(plan('business'))

		await user.keyboard(' ')

		expect(checkedPlans()).toEqual(['starter'])

		expect(onChange).not.toHaveBeenCalled()

		// Read-only is not disabled: the radio keeps the focus.
		expect(plan('business')).toHaveFocus()
	})

	it('moves the focus with the arrow keys and keeps the selection', async () => {
		const user = setupUser()

		const onChange = vi.fn()

		renderUI(<Plans readOnly onChange={onChange} />)

		plan('starter').focus()

		await user.keyboard('{ArrowDown}')

		expect(plan('business')).toHaveFocus()

		await user.keyboard('{ArrowDown}')

		expect(plan('enterprise')).toHaveFocus()

		expect(checkedPlans()).toEqual(['starter'])

		expect(onChange).not.toHaveBeenCalled()
	})

	it('submits the checked radio', async () => {
		const user = setupUser()

		renderUI(<Plans readOnly />)

		await user.click(plan('business'))

		const form = present<HTMLFormElement>(plan('starter').form, 'form')

		expect(new FormData(form).get('plan')).toBe('starter')
	})

	it('checks a radio and fires onChange again when readOnly turns off', async () => {
		const user = setupUser()

		const onChange = vi.fn()

		const { rerender } = renderUI(<Plans readOnly onChange={onChange} />)

		await user.click(plan('business'))

		rerender(<Plans onChange={onChange} />)

		await user.click(plan('business'))

		expect(checkedPlans()).toEqual(['business'])

		expect(onChange).toHaveBeenCalledExactlyOnceWith('business')
	})

	// A browser checks the old radio again when a click is canceled. jsdom does
	// not, so an uncontrolled group reads the cancel here, and
	// `browser/radio-read-only.test.tsx` reads the selection.
	it('cancels the click on a radio of an uncontrolled group', () => {
		const { container } = renderUI(
			<RadioGroup aria-label="Plan" readOnly>
				<Radio name="plan" value="starter" defaultChecked />
				<Radio name="plan" value="business" />
			</RadioGroup>,
		)

		const [, business] = container.querySelectorAll<HTMLInputElement>('input')

		const input = present<HTMLInputElement>(business, 'radio business')

		expect(fireEvent.click(input)).toBe(false)

		expect(input.checked).toBe(false)
	})
})

describe('Radio readOnly', () => {
	it('keeps an explicit read-only radio unchecked', async () => {
		const user = setupUser()

		const onChange = vi.fn()

		const { container } = renderUI(<Radio name="plan" readOnly onChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'radio')

		await user.click(input)

		expect(input.checked).toBe(false)

		expect(onChange).not.toHaveBeenCalled()

		expect(input).toHaveFocus()

		expect(input).not.toHaveAttribute('aria-readonly')
	})
})

describe('Radio size', () => {
	it('opens a scope for an explicit size prop', () => {
		const { container } = renderUI(<Radio size="lg" />)

		expect(getSlot(container, 'control')).toHaveAttribute('data-density', 'lg')

		expect(densityStepOf(getSlot(container, 'radio-indicator'))).toBe('lg')
	})
})

describe('RadioField aria-describedby', () => {
	it('points the radio at a rendered Description', () => {
		const { container } = renderUI(
			<RadioField>
				<Radio />
				<Description>Receive email notifications.</Description>
			</RadioField>,
		)

		const input = getSlot<HTMLInputElement>(container, 'radio')

		const description = getSlot(container, 'description')

		expect(description.id).toBeTruthy()

		expect(input).toHaveAttribute('aria-describedby', description.id)
	})
})

describe('Radio touch', () => {
	// When the page is zoomed in, iOS holds a tap for a possible double tap. A
	// second tap on a near row in that time joins the first, and neither selects.
	it('stops the double-tap wait on the group, the row, and the radio', () => {
		const { container } = renderUI(
			<RadioGroup aria-label="Plan">
				<RadioField>
					<Radio name="plan" value="starter" />
					<Label>Starter</Label>
				</RadioField>
			</RadioGroup>,
		)

		expect(screen.getByRole('radiogroup')).toHaveClass('touch-manipulation')

		const field = getSlot(container, 'field')

		expect(field).toHaveClass('touch-manipulation')

		expect(getSlot(field, 'control')).toHaveClass('touch-manipulation')
	})
})

describe('Radio native form reset', () => {
	it('returns an uncontrolled group to its defaultChecked radio', async () => {
		const user = setupUser()

		renderUI(
			<form>
				<Radio name="plan" value="free" aria-label="Free" defaultChecked />
				<Radio name="plan" value="pro" aria-label="Pro" />
				<button type="reset">Reset</button>
			</form>,
		)

		await user.click(screen.getByRole('radio', { name: 'Pro' }))

		await user.click(screen.getByRole('button', { name: 'Reset' }))

		await act(() => new Promise(requestAnimationFrame))

		expect(screen.getByRole('radio', { name: 'Free' })).toBeChecked()

		expect(screen.getByRole('radio', { name: 'Pro' })).not.toBeChecked()
	})
})
