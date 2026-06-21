import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { Control } from '../../components/control'
import { Description, Label, Message } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Switch } from '../../components/switch'
import { Textarea } from '../../components/textarea'
import { allBySlot, bySlot, renderUI, screen } from '../helpers'

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
			<Control invalid>
				<Input />
			</Control>,
		)
		const input = bySlot(container, 'input')
		expect(input).toHaveAttribute('data-invalid')
		expect(input).toHaveAttribute('aria-invalid', 'true')
	})

	it('treats severity="error" as invalid on a nested input', () => {
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
			<Control invalid>
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

	it('parent invalid does NOT propagate to child', () => {
		const { container } = renderUI(
			<Control invalid>
				<Control id="child">
					<Input />
				</Control>
			</Control>,
		)
		expect(bySlot(container, 'input')).not.toHaveAttribute('data-invalid')
	})

	it('parent required does NOT propagate to child', () => {
		const { container } = renderUI(
			<Control required>
				<Control id="child">
					<Input />
				</Control>
			</Control>,
		)
		expect(bySlot(container, 'input')).not.toBeRequired()
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
	it.each<[string, () => ReactElement, string]>([
		[
			'Input inherits size from Control',
			() => (
				<Control size="lg">
					<Input />
				</Control>
			),
			'input',
		],
		[
			'Input explicit size overrides Control size',
			() => (
				<Control size="lg">
					<Input size="sm" />
				</Control>
			),
			'input',
		],
		[
			'Switch inherits size from Control',
			() => (
				<Control size="lg">
					<Switch />
				</Control>
			),
			'switch',
		],
		[
			'nested Control inherits parent size when not explicitly set',
			() => (
				<Control size="sm">
					<Control id="child">
						<Input />
					</Control>
				</Control>
			),
			'input',
		],
		[
			'nested Control size overrides parent size',
			() => (
				<Control size="sm">
					<Control size="lg" id="child">
						<Input />
					</Control>
				</Control>
			),
			'input',
		],
	])('%s', (_name, ui, slot) => {
		const { container } = renderUI(ui())

		expect(bySlot(container, slot)).toBeInTheDocument()
	})
})

describe('Control + variant', () => {
	it.each<[string, () => ReactElement, string]>([
		[
			'Input inherits variant from Control',
			() => (
				<Control variant="outline">
					<Input />
				</Control>
			),
			'input',
		],
		[
			'Input explicit variant overrides Control variant',
			() => (
				<Control variant="outline">
					<Input variant="default" />
				</Control>
			),
			'input',
		],
		[
			'Textarea inherits variant from Control',
			() => (
				<Control variant="outline">
					<Textarea />
				</Control>
			),
			'textarea',
		],
	])('%s', (_name, ui, slot) => {
		const { container } = renderUI(ui())

		expect(bySlot(container, slot)).toBeInTheDocument()
	})
})
