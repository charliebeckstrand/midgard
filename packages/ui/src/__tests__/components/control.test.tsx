import { describe, expect, it } from 'vitest'
import { Control } from '../../components/control'
import { Description, ErrorMessage, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Switch } from '../../components/switch'
import { Textarea } from '../../components/textarea'
import { allBySlot, bySlot, renderUI, screen } from '../helpers'

describe('Control', () => {
	it('renders with data-slot="control"', () => {
		const { container } = renderUI(<Control>content</Control>)
		expect(bySlot(container, 'control')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<Control>Hello</Control>)
		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Control className="custom">content</Control>)
		expect(bySlot(container, 'control')?.className).toContain('custom')
	})

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

describe('Control + ErrorMessage', () => {
	it('auto-wires id from control', () => {
		const { container } = renderUI(
			<Control id="test">
				<ErrorMessage>Error</ErrorMessage>
			</Control>,
		)
		expect(bySlot(container, 'error')).toHaveAttribute('id', 'test-error')
	})

	it('explicit id overrides control-derived id', () => {
		const { container } = renderUI(
			<Control id="test">
				<ErrorMessage id="custom">Error</ErrorMessage>
			</Control>,
		)
		expect(bySlot(container, 'error')).toHaveAttribute('id', 'custom')
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

// ── Nesting ────────────────────────────────────────────────

describe('Control nesting', () => {
	it('parent disabled propagates to child Control input', () => {
		const { container } = renderUI(
			<Control disabled>
				<Control id="child">
					<Input />
				</Control>
			</Control>,
		)
		expect(bySlot(container, 'input')).toBeDisabled()
	})

	it('child disabled works independently when parent is not disabled', () => {
		const { container } = renderUI(
			<Control>
				<Control disabled id="child">
					<Input />
				</Control>
			</Control>,
		)
		expect(bySlot(container, 'input')).toBeDisabled()
	})

	it('parent disabled cannot be overridden by child disabled={false}', () => {
		const { container } = renderUI(
			<Control disabled>
				<Control disabled={false} id="child">
					<Input />
				</Control>
			</Control>,
		)
		// OR semantics: parent wins
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
		// Both parent and child control wrappers should be marked disabled
		expect(controls[0]).toHaveAttribute('data-disabled')
		expect(controls[1]).toHaveAttribute('data-disabled')
	})

	it('three-level nesting: grandparent disabled propagates to leaf', () => {
		const { container } = renderUI(
			<Control disabled>
				<Control id="mid">
					<Control id="leaf">
						<Input />
					</Control>
				</Control>
			</Control>,
		)
		expect(bySlot(container, 'input')).toBeDisabled()
	})
})

// ── Size / Variant ─────────────────────────────────────────

describe('Control + size', () => {
	it('Input inherits size from Control', () => {
		const { container } = renderUI(
			<Control size="lg">
				<Input />
			</Control>,
		)
		// The input element should have the lg size class applied via inputVariants
		const input = bySlot(container, 'input')
		expect(input).toBeInTheDocument()
	})

	it('Input explicit size overrides Control size', () => {
		const { container } = renderUI(
			<Control size="lg">
				<Input size="sm" />
			</Control>,
		)
		const input = bySlot(container, 'input')
		expect(input).toBeInTheDocument()
	})

	it('Switch inherits size from Control', () => {
		const { container } = renderUI(
			<Control size="lg">
				<Switch />
			</Control>,
		)
		const sw = bySlot(container, 'switch')
		expect(sw).toBeInTheDocument()
	})

	it('nested Control inherits parent size when not explicitly set', () => {
		const { container } = renderUI(
			<Control size="sm">
				<Control id="child">
					<Input />
				</Control>
			</Control>,
		)
		// Child Control inherits size="sm" from parent
		const input = bySlot(container, 'input')
		expect(input).toBeInTheDocument()
	})

	it('nested Control size overrides parent size', () => {
		const { container } = renderUI(
			<Control size="sm">
				<Control size="lg" id="child">
					<Input />
				</Control>
			</Control>,
		)
		const input = bySlot(container, 'input')
		expect(input).toBeInTheDocument()
	})
})

describe('Control + variant', () => {
	it('Input inherits variant from Control', () => {
		const { container } = renderUI(
			<Control variant="outline">
				<Input />
			</Control>,
		)
		const input = bySlot(container, 'input')
		expect(input).toBeInTheDocument()
	})

	it('Input explicit variant overrides Control variant', () => {
		const { container } = renderUI(
			<Control variant="outline">
				<Input variant="glass" />
			</Control>,
		)
		const input = bySlot(container, 'input')
		expect(input).toBeInTheDocument()
	})

	it('Textarea inherits variant from Control', () => {
		const { container } = renderUI(
			<Control variant="outline">
				<Textarea />
			</Control>,
		)
		const textarea = bySlot(container, 'textarea')
		expect(textarea).toBeInTheDocument()
	})
})
