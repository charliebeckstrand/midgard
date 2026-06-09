import { describe, expect, it, vi } from 'vitest'
import { Field, Label } from '../../components/fieldset'
import { Listbox } from '../../components/listbox'
import { VirtualOptions } from '../../primitives/virtual-options'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

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

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(
			<Listbox>
				<div>Option</div>
			</Listbox>,
			{ skeleton: true },
		)

		expect(bySlot(container, 'listbox-button')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
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

	it('suppresses the trigger mousedown default while open so focus stays on the panel', () => {
		const { container } = renderUI(
			<Listbox open value="a" displayValue={(v) => v}>
				<div role="option" tabIndex={-1} aria-selected="true" data-selected>
					A
				</div>
			</Listbox>,
		)

		const button = bySlot(container, 'listbox-button') as HTMLElement

		// A cancelled mousedown keeps focus on the active option, so a press
		// released off-target leaves the panel navigable by keyboard.
		const notCancelled = fireEvent.mouseDown(button)

		expect(notCancelled).toBe(false)
	})

	it('leaves the trigger mousedown default intact while closed', () => {
		const { container } = renderUI(
			<Listbox>
				<div role="option" tabIndex={-1} aria-selected="false">
					A
				</div>
			</Listbox>,
		)

		const button = bySlot(container, 'listbox-button') as HTMLElement

		const notCancelled = fireEvent.mouseDown(button)

		expect(notCancelled).toBe(true)
	})

	// Regression: the default chevron sits in the suffix slot beside the trigger,
	// not inside it, so a bare mousedown blurred the focused trigger (focus only
	// returned on the click that followed). Cancelling the suffix mousedown keeps
	// focus on the trigger.
	it('cancels mousedown on the default chevron so the trigger keeps focus', () => {
		const { container } = renderUI(
			<Listbox>
				<div>Option</div>
			</Listbox>,
		)

		const notCancelled = fireEvent.mouseDown(bySlot(container, 'suffix') as HTMLElement)

		expect(notCancelled).toBe(false)
	})

	// A caller-supplied suffix owns its own pointer behaviour; the focus guard is
	// scoped to the default chevron and must not swallow a custom suffix's events.
	it('leaves mousedown intact on a custom suffix', () => {
		const { container } = renderUI(
			<Listbox suffix={<span data-testid="suffix">USD</span>}>
				<div>Option</div>
			</Listbox>,
		)

		const notCancelled = fireEvent.mouseDown(bySlot(container, 'suffix') as HTMLElement)

		expect(notCancelled).toBe(true)
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

	it('VirtualOptions is exported and mounts', () => {
		// Listbox opens on click; exercise the virtualization helper by mounting
		// it inside a matching role="listbox" container.
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
		expect(container.querySelectorAll('[role="option"]').length).toBeLessThanOrEqual(items.length)
	})
})
