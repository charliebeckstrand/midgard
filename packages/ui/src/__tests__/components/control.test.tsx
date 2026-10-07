import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from '../../components/checkbox'
import { Control } from '../../components/control'
import { Description, Field, Label, Message } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { Switch } from '../../components/switch'
import { Textarea } from '../../components/textarea'
import type { DensityStep } from '../../core/density'
import { allBySlot, bySlot, densityStepOf, present, renderUI, screen, setupUser } from '../helpers'

describe('Control', () => {
	it('sets data-disabled when disabled', () => {
		const { container } = renderUI(<Control disabled>content</Control>)

		expect(bySlot(container, 'control')).toHaveAttribute('data-disabled')
	})

	it('does not set data-disabled when not disabled', () => {
		const { container } = renderUI(<Control>content</Control>)

		expect(bySlot(container, 'control')).not.toHaveAttribute('data-disabled')
	})
})

describe('Control + Label', () => {
	it('auto-wires htmlFor to the generated id', () => {
		const { container } = renderUI(
			<Control>
				<Label>Email</Label>
				<Input />
			</Control>,
		)

		const label = bySlot(container, 'label')

		const input = bySlot(container, 'input')

		expect(label).toHaveAttribute('for')

		expect(label?.getAttribute('for')).toBe(input?.getAttribute('id'))
	})

	it('explicit htmlFor overrides control id', () => {
		renderUI(
			<Control>
				<Label htmlFor="custom">Email</Label>
				<Input />
			</Control>,
		)

		expect(screen.getByText('Email')).toHaveAttribute('for', 'custom')
	})

	it('works without Control (backward compatible)', () => {
		renderUI(<Label htmlFor="manual">Email</Label>)

		expect(screen.getByText('Email')).toHaveAttribute('for', 'manual')
	})
})

describe('Control + Description', () => {
	it('auto-wires id from control', () => {
		const { container } = renderUI(
			<Control id="test">
				<Description>Help text</Description>
			</Control>,
		)

		expect(bySlot(container, 'description')).toHaveAttribute('id', 'test-description')
	})

	it('explicit id overrides control-derived id', () => {
		const { container } = renderUI(
			<Control id="test">
				<Description id="custom">Help text</Description>
			</Control>,
		)

		expect(bySlot(container, 'description')).toHaveAttribute('id', 'custom')
	})

	it('has no id outside Control', () => {
		const { container } = renderUI(<Description>Help text</Description>)

		expect(bySlot(container, 'description')).not.toHaveAttribute('id')
	})
})

describe('Control + Message', () => {
	it('auto-wires id from control', () => {
		const { container } = renderUI(
			<Control id="test">
				<Message>Error</Message>
			</Control>,
		)

		expect(bySlot(container, 'message')).toHaveAttribute('id', 'test-error')
	})

	it('explicit id overrides control-derived id', () => {
		const { container } = renderUI(
			<Control id="test">
				<Message id="custom">Error</Message>
			</Control>,
		)

		expect(bySlot(container, 'message')).toHaveAttribute('id', 'custom')
	})
})

describe('Control + Input', () => {
	it('inherits id from control', () => {
		const { container } = renderUI(
			<Control id="test">
				<Input />
			</Control>,
		)

		expect(bySlot(container, 'input')).toHaveAttribute('id', 'test')
	})

	it('explicit id overrides control id', () => {
		// The id mismatch warns in development. The case below asserts the warning.
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		const { container } = renderUI(
			<Control id="test">
				<Input id="custom" />
			</Control>,
		)

		expect(bySlot(container, 'input')).toHaveAttribute('id', 'custom')
	})

	it('inherits disabled from control', () => {
		const { container } = renderUI(
			<Control disabled>
				<Input />
			</Control>,
		)

		expect(bySlot(container, 'input')).toBeDisabled()
	})

	it('inherits required from control', () => {
		const { container } = renderUI(
			<Control required>
				<Input />
			</Control>,
		)

		expect(bySlot(container, 'input')).toBeRequired()
	})

	it('inherits readOnly from control', () => {
		const { container } = renderUI(
			<Control readOnly>
				<Input />
			</Control>,
		)

		expect(bySlot(container, 'input')).toHaveAttribute('readonly')
	})

	it('sets data-invalid and aria-invalid when control is invalid', () => {
		const { container } = renderUI(
			<Control severity="error">
				<Input />
			</Control>,
		)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('data-invalid')

		expect(input).toHaveAttribute('aria-invalid', 'true')
	})

	it('broadcasts severity="warning" as data-warning without aria-invalid', () => {
		const { container } = renderUI(
			<Control severity="warning">
				<Input />
			</Control>,
		)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('data-warning')

		expect(input).not.toHaveAttribute('aria-invalid')

		expect(input).not.toHaveAttribute('data-invalid')
	})

	it('broadcasts severity="success" as data-valid without aria-invalid', () => {
		const { container } = renderUI(
			<Control severity="success">
				<Input />
			</Control>,
		)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('data-valid')

		expect(input).not.toHaveAttribute('aria-invalid')
	})

	it('explicit disabled={false} overrides control disabled', () => {
		const { container } = renderUI(
			<Control disabled>
				<Input disabled={false} />
			</Control>,
		)

		expect(bySlot(container, 'input')).not.toBeDisabled()
	})

	it('works without Control', () => {
		const { container } = renderUI(<Input id="standalone" />)

		expect(bySlot(container, 'input')).toHaveAttribute('id', 'standalone')
	})
})

describe('Control + explicit control id', () => {
	// The Label takes its `for` from the wrapper id. An explicit id on the
	// control that differs leaves the Label with no control, so a development
	// warning steers the consumer to `htmlFor` on the wrapper.
	it('warns one time when an explicit id differs from the Field id', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const ui = (
			<Field>
				<Label>Email</Label>
				<Input id="custom" />
			</Field>
		)

		const { rerender } = renderUI(ui)

		rerender(ui)

		expect(warn).toHaveBeenCalledTimes(1)

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('htmlFor="custom"'))
	})

	it.each<[string, () => ReactElement]>([
		[
			'the explicit id matches the Field htmlFor',
			() => (
				<Field htmlFor="custom">
					<Label>Email</Label>
					<Input id="custom" />
				</Field>
			),
		],
		[
			'the explicit id matches the Control id',
			() => (
				<Control id="custom">
					<Input id="custom" />
				</Control>
			),
		],
		[
			'the control takes the Field id',
			() => (
				<Field>
					<Label>Email</Label>
					<Input />
				</Field>
			),
		],
		['the control has an explicit id and no wrapper', () => <Input id="standalone" />],
	])('does not warn when %s', (_name, ui) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		renderUI(ui())

		expect(warn).not.toHaveBeenCalled()
	})
})

describe('Control + Textarea', () => {
	it('inherits id from control', () => {
		const { container } = renderUI(
			<Control id="test">
				<Textarea />
			</Control>,
		)

		expect(bySlot(container, 'textarea')).toHaveAttribute('id', 'test')
	})

	it('inherits disabled from control', () => {
		const { container } = renderUI(
			<Control disabled>
				<Textarea />
			</Control>,
		)

		expect(bySlot(container, 'textarea')).toBeDisabled()
	})

	it('sets data-invalid when control is invalid', () => {
		const { container } = renderUI(
			<Control severity="error">
				<Textarea />
			</Control>,
		)

		expect(bySlot(container, 'textarea')).toHaveAttribute('data-invalid')
	})
})

describe('Control nesting', () => {
	// OR semantics: a disabled ancestor at any depth disables a descendant input.
	it.each<[string, () => ReactElement]>([
		[
			'parent disabled propagates to child Control input',
			() => (
				<Control disabled>
					<Control id="child">
						<Input />
					</Control>
				</Control>
			),
		],
		[
			'child disabled works independently when parent is not disabled',
			() => (
				<Control>
					<Control disabled id="child">
						<Input />
					</Control>
				</Control>
			),
		],
		[
			'parent disabled cannot be overridden by child disabled={false}',
			() => (
				<Control disabled>
					<Control disabled={false} id="child">
						<Input />
					</Control>
				</Control>
			),
		],
		[
			'three-level nesting: grandparent disabled propagates to leaf',
			() => (
				<Control disabled>
					<Control id="mid">
						<Control id="leaf">
							<Input />
						</Control>
					</Control>
				</Control>
			),
		],
	])('%s', (_name, ui) => {
		const { container } = renderUI(ui())

		expect(bySlot(container, 'input')).toBeDisabled()
	})

	// The checkbox and the switch read `readOnly` as a block on the toggle, not
	// as the native attribute, which has no effect on a checkbox.
	it.each<[string, () => ReactElement]>([
		['checkbox', () => <Checkbox />],
		['switch', () => <Switch />],
	])('parent readOnly reaches a nested %s', async (slot, ui) => {
		const user = setupUser()

		const { container } = renderUI(
			<Control readOnly>
				<Control id="child">{ui()}</Control>
			</Control>,
		)

		const input = present<HTMLInputElement>(bySlot(container, slot), slot)

		expect(input).toHaveAttribute('aria-readonly', 'true')

		await user.click(input)

		expect(input.checked).toBe(false)
	})

	// ARIA defines aria-readonly on a radiogroup, not on a radio. The group
	// carries it, and the radio only blocks the check.
	it('parent readOnly reaches a nested radio', async () => {
		const user = setupUser()

		const { container } = renderUI(
			<Control readOnly>
				<Control id="child">
					<Radio name="plan" />
				</Control>
			</Control>,
		)

		const input = present<HTMLInputElement>(bySlot(container, 'radio'), 'radio')

		await user.click(input)

		expect(input.checked).toBe(false)

		expect(input).not.toHaveAttribute('aria-readonly')
	})

	it('parent readOnly reaches a RadioGroup and the radios in it', async () => {
		const user = setupUser()

		const onChange = vi.fn()

		const { container } = renderUI(
			<Control readOnly>
				<RadioGroup aria-label="Plan">
					<RadioField>
						<Radio name="plan" value="starter" onChange={onChange} />
						<Label>Starter</Label>
					</RadioField>
				</RadioGroup>
			</Control>,
		)

		expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-readonly', 'true')

		const input = present<HTMLInputElement>(bySlot(container, 'radio'), 'radio')

		await user.click(input)

		expect(input.checked).toBe(false)

		expect(onChange).not.toHaveBeenCalled()
	})

	it('parent readOnly propagates to child Control input', () => {
		const { container } = renderUI(
			<Control readOnly>
				<Control id="child">
					<Input />
				</Control>
			</Control>,
		)

		expect(bySlot(container, 'input')).toHaveAttribute('readonly')
	})

	it('parent required reaches the input of a child Control', () => {
		const { container } = renderUI(
			<Control required>
				<Control id="child">
					<Input />
				</Control>
			</Control>,
		)

		expect(bySlot(container, 'input')).toBeRequired()
	})

	it('error severity propagates into a nested child Control', () => {
		// severity cascades like variant: a nested Control inherits the
		// parent's error unless it sets its own severity.
		const { container } = renderUI(
			<Control severity="error">
				<Control id="child">
					<Input />
				</Control>
			</Control>,
		)

		expect(bySlot(container, 'input')).toHaveAttribute('data-invalid')
	})

	it('each nested Control has its own unique id', () => {
		const { container } = renderUI(
			<Control id="parent">
				<Input />
				<Control id="child">
					<Input />
				</Control>
			</Control>,
		)

		const inputs = allBySlot(container, 'input')

		expect(inputs[0]).toHaveAttribute('id', 'parent')

		expect(inputs[1]).toHaveAttribute('id', 'child')
	})

	it('child Label htmlFor points to child id, not parent id', () => {
		const { container } = renderUI(
			<Control id="parent">
				<Control id="child">
					<Label>Name</Label>
					<Input />
				</Control>
			</Control>,
		)

		expect(bySlot(container, 'label')).toHaveAttribute('for', 'child')
	})

	it('parent disabled sets data-disabled on nested field wrapper', () => {
		const { container } = renderUI(
			<Control disabled>
				<Control id="child">content</Control>
			</Control>,
		)

		const controls = allBySlot(container, 'control')

		expect(controls[0]).toHaveAttribute('data-disabled')

		expect(controls[1]).toHaveAttribute('data-disabled')
	})
})

describe('Control + size', () => {
	// A sized Control is a density scope, and each field takes the step of its
	// nearest scope. The stepped classes are the same at each step, so each case
	// reads the step of the field, not its class.
	it.each<[string, ReactElement, string, DensityStep]>([
		[
			'an Input takes the step of its Control',
			<Control key="c" size="lg">
				<Input />
			</Control>,
			'input',
			'lg',
		],
		[
			'an explicit Input size wins over the Control size',
			<Control key="c" size="lg">
				<Input size="sm" />
			</Control>,
			'input',
			'sm',
		],
		[
			'a Switch takes the step of its Control',
			<Control key="c" size="lg">
				<Switch />
			</Control>,
			'switch',
			'lg',
		],
		[
			'a nested Control with no size takes the step of the outer Control',
			<Control key="c" size="sm">
				<Control id="child">
					<Input />
				</Control>
			</Control>,
			'input',
			'sm',
		],
		[
			'a nested Control size wins over the outer Control size',
			<Control key="c" size="sm">
				<Control size="lg" id="child">
					<Input />
				</Control>
			</Control>,
			'input',
			'lg',
		],
	])('%s', (_name, ui, slot, step) => {
		const { container } = renderUI(ui)

		expect(densityStepOf(present(bySlot(container, slot), slot))).toBe(step)
	})
})

describe('Control + variant', () => {
	// Variant paints the framed surface, not the inner element: `default` adds
	// `bg-white …` to the control-frame while `outline` leaves it ring-only
	// (the input/textarea className is variant-invariant). Each case names the
	// variant the frame must resolve to; `baseline` renders that element
	// standalone at the resolved variant, and the row passes only when the
	// Control-driven control-frame className equals it. A broken inherit (frame
	// stays `default`) or a broken override (Control's variant leaks past the
	// local prop) diverges the frame className and fails the row.
	it.each<[string, () => ReactElement, () => ReactElement]>([
		[
			'Input inherits variant from Control',
			() => (
				<Control variant="outline">
					<Input />
				</Control>
			),
			() => <Input variant="outline" />,
		],
		[
			'Input explicit variant overrides Control variant',
			() => (
				<Control variant="outline">
					<Input variant="default" />
				</Control>
			),
			() => <Input variant="default" />,
		],
		[
			'Textarea inherits variant from Control',
			() => (
				<Control variant="outline">
					<Textarea />
				</Control>
			),
			() => <Textarea variant="outline" />,
		],
	])('%s', (_name, ui, baseline) => {
		const { container } = renderUI(ui())

		const { container: expected } = renderUI(baseline())

		expect(bySlot(container, 'control-frame')?.className).toBe(
			bySlot(expected, 'control-frame')?.className,
		)
	})
})
