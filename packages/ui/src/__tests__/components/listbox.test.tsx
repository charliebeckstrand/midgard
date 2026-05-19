import { describe, expect, it } from 'vitest'
import { Listbox } from '../../components/listbox'
import { resolveLabel } from '../../components/listbox/listbox-utilities'
import { VirtualOptions } from '../../primitives/virtual-options'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Listbox', () => {
	it('renders with data-slot="control"', () => {
		const { container } = renderUI(
			<Listbox>
				<div>Option</div>
			</Listbox>,
		)

		const el = bySlot(container, 'control')

		expect(el).toBeInTheDocument()
	})

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

	it('applies custom className', () => {
		const { container } = renderUI(
			<Listbox className="custom">
				<div>Option</div>
			</Listbox>,
		)

		const el = bySlot(container, 'control')

		expect(el?.className).toContain('custom')
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

	it('resolves an explicit size override', () => {
		const { container } = renderUI(
			<Listbox size="lg">
				<div>Option</div>
			</Listbox>,
		)

		expect(bySlot(container, 'listbox-button')).toBeInTheDocument()
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

describe('resolveLabel', () => {
	it('returns undefined when value is undefined in single-select mode', () => {
		expect(resolveLabel({ value: undefined, multiple: false })).toBeUndefined()
	})

	it('returns the displayValue result in single-select mode', () => {
		expect(
			resolveLabel({
				value: { id: 1, name: 'Alice' },
				displayValue: (v) => v.name,
				multiple: false,
			}),
		).toBe('Alice')
	})

	it('returns undefined when the multi-select array is empty', () => {
		expect(resolveLabel({ value: [], multiple: true })).toBeUndefined()
	})

	it('joins displayValue results with commas when multi-select has up to three items', () => {
		expect(
			resolveLabel({
				value: ['a', 'b'],
				displayValue: (v) => v.toUpperCase(),
				multiple: true,
			}),
		).toBe('A, B')
	})

	it('falls back to the count label when no displayValue is provided', () => {
		expect(resolveLabel({ value: ['a', 'b'], multiple: true })).toBe('2 selected')
	})

	it('uses the count label when more than three items are selected', () => {
		expect(
			resolveLabel({
				value: ['a', 'b', 'c', 'd'],
				displayValue: (v) => v,
				multiple: true,
			}),
		).toBe('4 selected')
	})

	it('treats a non-array value as empty in multi-select mode', () => {
		expect(resolveLabel({ value: 'a', multiple: true })).toBeUndefined()
	})
})
