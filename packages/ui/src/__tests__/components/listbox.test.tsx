import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Control } from '../../components/control'
import { Field, Label } from '../../components/fieldset'
import { Form, useFormField } from '../../components/form'
import { Listbox } from '../../components/listbox'
import { VirtualOptions } from '../../primitives/virtual-options'
import { act, bySlot, fireEvent, renderUI, screen } from '../helpers'

const option = (
	<div role="option" tabIndex={-1} aria-selected="false">
		Option
	</div>
)

function FieldProbe({ name }: { name: string }) {
	const field = useFormField(name)

	return (
		<output data-slot="probe" data-touched={field?.touched}>
			{String(field?.value)}
		</output>
	)
}

describe('Listbox', () => {
	it('renders trigger button with combobox role', () => {
		const { container } = renderUI(
			<Listbox>
				<div>Option</div>
			</Listbox>,
		)

		const button = bySlot(container, 'listbox-button')

		expect(button).toBeInTheDocument()

		expect(button).toHaveAttribute('role', 'combobox')
	})

	// A role="combobox" trigger is named by aria-label, not its value text;
	// a bare Listbox (no Field/Label) forwards aria-label to the button.
	it('forwards aria-label to the trigger button', () => {
		const { container } = renderUI(
			<Listbox aria-label="Current page">
				<div>Option</div>
			</Listbox>,
		)

		expect(bySlot(container, 'listbox-button')).toHaveAttribute('aria-label', 'Current page')
	})

	it('shows placeholder when no value selected', () => {
		renderUI(
			<Listbox placeholder="Choose">
				<div>Option</div>
			</Listbox>,
		)

		expect(screen.getByText('Choose')).toBeInTheDocument()
	})

	it('renders trigger as a button element', () => {
		const { container } = renderUI(
			<Listbox>
				<div>Option</div>
			</Listbox>,
		)

		const button = bySlot(container, 'listbox-button')

		expect(button?.tagName).toBe('BUTTON')
	})

	it('renders prefix and suffix slots and keeps trigger clickable', () => {
		const { container } = renderUI(
			<Listbox
				prefix={<span data-testid="prefix">$</span>}
				suffix={<span data-testid="suffix">USD</span>}
			>
				<div>Option</div>
			</Listbox>,
		)

		const prefix = bySlot(container, 'prefix')

		const suffix = bySlot(container, 'suffix')

		const button = bySlot(container, 'listbox-button')

		expect(prefix).toBeInTheDocument()

		expect(prefix?.querySelector('[data-testid="prefix"]')).toBeInTheDocument()

		expect(suffix).toBeInTheDocument()

		expect(suffix?.querySelector('[data-testid="suffix"]')).toBeInTheDocument()

		expect(button).toBeInTheDocument()

		expect(button?.tagName).toBe('BUTTON')

		expect(button).toHaveAttribute('role', 'combobox')

		expect(button).not.toBeDisabled()
	})

	it('omits the prefix slot and renders the default chevron in the suffix slot when not provided', () => {
		const { container } = renderUI(
			<Listbox>
				<div>Option</div>
			</Listbox>,
		)

		expect(bySlot(container, 'prefix')).not.toBeInTheDocument()

		const suffix = bySlot(container, 'suffix')

		expect(suffix).toBeInTheDocument()

		expect(suffix?.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it.each([
		null,
		false,
		'',
	] as const)('falls back to the default chevron when suffix is %p', (value) => {
		const { container } = renderUI(
			<Listbox suffix={value}>
				<div>Option</div>
			</Listbox>,
		)

		const suffix = bySlot(container, 'suffix')

		expect(suffix).toBeInTheDocument()

		expect(suffix?.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('opens the panel and exposes a listbox role when the trigger is clicked', () => {
		const { container } = renderUI(
			<Listbox>
				<div role="option" tabIndex={-1} aria-selected="false">
					Option
				</div>
			</Listbox>,
		)

		const button = bySlot(container, 'listbox-button') as HTMLElement

		fireEvent.click(button)

		expect(button).toHaveAttribute('aria-expanded', 'true')

		expect(button).toHaveAttribute('aria-controls')

		// Panel renders through a portal once open.
		expect(screen.getByRole('listbox')).toBeInTheDocument()

		// Single-select listbox is not multiselectable.
		expect(screen.getByRole('listbox')).not.toHaveAttribute('aria-multiselectable')
	})

	it('threads the trigger name onto the open listbox', () => {
		const { container } = renderUI(
			<Listbox aria-label="Current page">
				<div role="option" tabIndex={-1} aria-selected="false">
					Option
				</div>
			</Listbox>,
		)

		fireEvent.click(bySlot(container, 'listbox-button') as HTMLElement)

		expect(screen.getByRole('listbox', { name: 'Current page' })).toBeInTheDocument()
	})

	it('merges a consumer aria-describedby ahead of the field ids', () => {
		renderUI(
			<>
				<p id="hint">Pick a fruit</p>
				<Listbox aria-label="Fruit" aria-describedby="hint">
					<div>Option</div>
				</Listbox>
			</>,
		)

		const button = screen.getByRole('combobox', { name: 'Fruit' })

		expect(button.getAttribute('aria-describedby')).toContain('hint')
	})

	it('names the listbox from a wrapping Field Label (no explicit aria-label)', () => {
		const { container } = renderUI(
			<Field>
				<Label>Country</Label>
				<Listbox>
					<div role="option" tabIndex={-1} aria-selected="false">
						Option
					</div>
				</Listbox>
			</Field>,
		)

		fireEvent.click(bySlot(container, 'listbox-button') as HTMLElement)

		// The popup's aria-labelledby resolves to the registered Label id.
		expect(screen.getByRole('listbox', { name: 'Country' })).toBeInTheDocument()
	})

	it('marks a multiple listbox as multiselectable', () => {
		const { container } = renderUI(
			<Listbox multiple>
				<div role="option" tabIndex={-1} aria-selected="false">
					Option
				</div>
			</Listbox>,
		)

		fireEvent.click(bySlot(container, 'listbox-button') as HTMLElement)

		expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true')
	})

	// The focus guard cancels mousedown only where keeping focus on the trigger
	// matters: the open trigger (so a press released off-target stays navigable)
	// and the default chevron in the suffix slot. A closed trigger and a
	// caller-supplied suffix own their own pointer behavior and stay intact.
	// `notCancelled` is false when preventDefault ran.
	it.each<[string, () => ReactElement, string, boolean]>([
		[
			'suppresses the trigger mousedown default while open so focus stays on the panel',
			() => (
				<Listbox open value="a" displayValue={(v) => v}>
					<div role="option" tabIndex={-1} aria-selected="true" data-selected>
						A
					</div>
				</Listbox>
			),
			'listbox-button',
			false,
		],
		[
			'leaves the trigger mousedown default intact while closed',
			() => (
				<Listbox>
					<div role="option" tabIndex={-1} aria-selected="false">
						A
					</div>
				</Listbox>
			),
			'listbox-button',
			true,
		],
		[
			'cancels mousedown on the default chevron so the trigger keeps focus',
			() => (
				<Listbox>
					<div>Option</div>
				</Listbox>
			),
			'suffix',
			false,
		],
		[
			'leaves mousedown intact on a custom suffix',
			() => (
				<Listbox suffix={<span data-testid="suffix">USD</span>}>
					<div>Option</div>
				</Listbox>
			),
			'suffix',
			true,
		],
	])('%s', (_name, ui, slot, expected) => {
		const { container } = renderUI(ui())

		const notCancelled = fireEvent.mouseDown(bySlot(container, slot) as HTMLElement)

		expect(notCancelled).toBe(expected)
	})

	it('shows a clear button only when clearable and a value is selected', () => {
		const { container, rerender } = renderUI(
			<Listbox<string> clearable value="a" displayValue={(v) => v}>
				<div>Option</div>
			</Listbox>,
		)

		expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument()

		rerender(
			<Listbox<string> clearable displayValue={(v) => v}>
				<div>Option</div>
			</Listbox>,
		)

		expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument()

		expect(bySlot(container, 'suffix')?.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('clears a single selection on clear', () => {
		const onChange = vi.fn()

		renderUI(
			<Listbox clearable value="a" displayValue={(v) => v} onValueChange={onChange}>
				<div>Option</div>
			</Listbox>,
		)

		const clear = screen.getByRole('button', { name: 'Clear selection' })

		// mousedown is swallowed so the trigger doesn't toggle the listbox open.
		fireEvent.mouseDown(clear)

		fireEvent.click(clear)

		expect(onChange).toHaveBeenCalledWith(undefined)
	})

	it('returns focus to the trigger after clearing', () => {
		renderUI(
			<Listbox clearable value="a" displayValue={(v) => v}>
				<div>Option</div>
			</Listbox>,
		)

		const trigger = screen.getByRole('combobox')

		fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))

		// The clear button unmounts with the selection; focus must land on the
		// trigger, not <body>.
		expect(trigger).toHaveFocus()
	})

	it('clears a multiple selection to an empty array', () => {
		const onChange = vi.fn()

		renderUI(
			<Listbox multiple clearable value={['a']} onValueChange={onChange}>
				<div>Option</div>
			</Listbox>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))

		expect(onChange).toHaveBeenCalledWith([])
	})

	// Covers the explicit-size branch of the density resolution in listbox.tsx
	// (size prop selects a densityPreset over the inherited token).
	it('resolves an explicit size override', () => {
		const { container } = renderUI(
			<Listbox size="lg">
				<div>Option</div>
			</Listbox>,
		)

		expect(bySlot(container, 'listbox-button')).toBeInTheDocument()
	})

	it('renders the selected value label via displayValue', () => {
		renderUI(
			<Listbox value="alpha" displayValue={(v) => v.toUpperCase()}>
				<div>Option</div>
			</Listbox>,
		)

		expect(screen.getByText('ALPHA')).toBeInTheDocument()
	})

	it('applies tabular-nums when tabularNums is set', () => {
		const { container } = renderUI(
			<Listbox tabularNums value="1.234" displayValue={(v) => v}>
				<div>Option</div>
			</Listbox>,
		)

		const button = bySlot(container, 'listbox-button') as HTMLElement

		// The tabular-nums class is applied to the inner label span.
		expect(button.querySelector('.tabular-nums')).toBeInTheDocument()
	})

	it('mounts in multi-select mode with an empty default value', () => {
		const { container } = renderUI(
			<Listbox multiple>
				<div>Option</div>
			</Listbox>,
		)

		const button = bySlot(container, 'listbox-button') as HTMLElement

		// No label resolved → placeholder visible.
		expect(button.textContent).toContain('Select')
	})

	it('renders the count summary when multi-select has more than 3 items', () => {
		renderUI(
			<Listbox multiple value={['a', 'b', 'c', 'd']}>
				<div>Option</div>
			</Listbox>,
		)

		expect(screen.getByText('4 selected')).toBeInTheDocument()
	})

	it('VirtualOptions is exported and mounts its window into a listbox', () => {
		const items = Array.from({ length: 500 }, (_, i) => ({ value: `v${i}`, label: `L${i}` }))

		const { container } = renderUI(
			<div role="listbox" style={{ maxHeight: '200px', overflow: 'auto' }}>
				<VirtualOptions items={items} estimateSize={32}>
					{(o) => (
						<div key={o.value} role="option" tabIndex={-1}>
							{o.label}
						</div>
					)}
				</VirtualOptions>
			</div>,
		)

		expect(bySlot(container, 'virtual-options')).toBeInTheDocument()

		// Windowing renders only the in-viewport rows; with no layout under jsdom
		// the scroll container measures zero, so zero options mount (never all
		// 500). Real-viewport windowing is asserted in the browser suite
		// (CONVENTIONS §10.3, §10.5).
		expect(container.querySelectorAll('[role="option"]')).toHaveLength(0)
	})
})

describe('Listbox in a Form', () => {
	it('reads the bound field value into the trigger label', () => {
		renderUI(
			<Form defaultValues={{ plan: 'pro' }}>
				<Listbox<string> name="plan" displayValue={(v) => v.toUpperCase()}>
					<div>Option</div>
				</Listbox>
			</Form>,
		)

		expect(screen.getByText('PRO')).toBeInTheDocument()
	})

	it('writes back through the bound field', () => {
		const { container } = renderUI(
			<Form defaultValues={{ plan: 'pro' as string | undefined }}>
				<Listbox<string> name="plan" clearable displayValue={(v) => v}>
					<div>Option</div>
				</Listbox>
				<FieldProbe name="plan" />
			</Form>,
		)

		// Clearing goes through the same setValue path option selection uses,
		// without driving the floating panel (CONVENTIONS §10.3).
		fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))

		expect(bySlot(container, 'probe')?.textContent).toBe('undefined')
	})

	it('lets an explicit value prop win over the form field', () => {
		renderUI(
			<Form defaultValues={{ plan: 'pro' }}>
				<Listbox<string> name="plan" value="basic" displayValue={(v) => v}>
					<div>Option</div>
				</Listbox>
			</Form>,
		)

		expect(screen.getByText('basic')).toBeInTheDocument()
	})

	it('marks the bound field touched when the trigger blurs', () => {
		const { container } = renderUI(
			<Form defaultValues={{ plan: 'pro' }}>
				<Listbox<string> name="plan" displayValue={(v) => v}>
					<div>Option</div>
				</Listbox>
				<FieldProbe name="plan" />
			</Form>,
		)

		expect(bySlot(container, 'probe')?.dataset.touched).toBe('false')

		fireEvent.blur(screen.getByRole('combobox'))

		expect(bySlot(container, 'probe')?.dataset.touched).toBe('true')
	})
})

describe('Listbox required', () => {
	it('surfaces aria-required on the trigger from the prop', () => {
		const { container } = renderUI(
			<Listbox required aria-label="Fruit">
				{option}
			</Listbox>,
		)

		expect(bySlot(container, 'listbox-button')).toHaveAttribute('aria-required', 'true')
	})

	it('resolves required from an enclosing Control', () => {
		const { container } = renderUI(
			<Control required>
				<Listbox aria-label="Fruit">{option}</Listbox>
			</Control>,
		)

		expect(bySlot(container, 'listbox-button')).toHaveAttribute('aria-required', 'true')
	})
})

describe('Listbox readOnly', () => {
	it('marks the trigger read-only without disabling it', () => {
		const { container } = renderUI(
			<Listbox readOnly aria-label="Fruit">
				{option}
			</Listbox>,
		)

		const button = bySlot(container, 'listbox-button') as HTMLButtonElement

		expect(button).toHaveAttribute('aria-readonly', 'true')

		// Read-only stays focusable and in the tab order (unlike disabled).
		expect(button).not.toBeDisabled()
	})

	it('does not open the menu on click while read-only', () => {
		const { container } = renderUI(
			<Listbox readOnly aria-label="Fruit">
				{option}
			</Listbox>,
		)

		const button = bySlot(container, 'listbox-button') as HTMLElement

		fireEvent.click(button)

		expect(button).toHaveAttribute('aria-expanded', 'false')

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
	})

	it('resolves readOnly from an enclosing Control', () => {
		const { container } = renderUI(
			<Control readOnly>
				<Listbox aria-label="Fruit">{option}</Listbox>
			</Control>,
		)

		expect(bySlot(container, 'listbox-button')).toHaveAttribute('aria-readonly', 'true')
	})

	it('still submits the bound value through a Form', async () => {
		const onSubmit = vi.fn()

		renderUI(
			<Form defaultValues={{ fruit: 'apple' }} onSubmit={onSubmit}>
				<Listbox readOnly name="fruit" aria-label="Fruit" displayValue={(v) => String(v)}>
					{option}
				</Listbox>
				<button type="submit">Submit</button>
			</Form>,
		)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
		})

		await vi.waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({ fruit: 'apple' }),
				expect.anything(),
			),
		)
	})
})
