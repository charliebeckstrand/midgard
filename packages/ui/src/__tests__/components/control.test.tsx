import { describe, expect, it } from 'vitest'
import { Control } from '../../components/control'
import { Description, ErrorMessage, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Textarea } from '../../components/textarea'
import { bySlot, renderUI, screen } from '../helpers'

describe('Control', () => {
	it('renders with data-slot="field"', () => {
		const { container } = renderUI(<Control>content</Control>)
		expect(bySlot(container, 'field')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<Control>Hello</Control>)
		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Control className="custom">content</Control>)
		expect(bySlot(container, 'field')?.className).toContain('custom')
	})

	it('sets data-disabled when disabled', () => {
		const { container } = renderUI(<Control disabled>content</Control>)
		expect(bySlot(container, 'field')).toHaveAttribute('data-disabled')
	})

	it('does not set data-disabled when not disabled', () => {
		const { container } = renderUI(<Control>content</Control>)
		expect(bySlot(container, 'field')).not.toHaveAttribute('data-disabled')
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
