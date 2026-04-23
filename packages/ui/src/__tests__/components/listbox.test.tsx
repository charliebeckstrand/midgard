import { describe, expect, it } from 'vitest'
import { Listbox, ListboxVirtualOptions } from '../../components/listbox'
import { resolveLabel } from '../../components/listbox/utilities'
import { bySlot, renderUI, screen } from '../helpers'

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

	it('ListboxVirtualOptions is exported and mounts', () => {
		// Listbox opens on click; exercise the virtualization helper by mounting
		// it inside a matching role="listbox" container.
		const items = Array.from({ length: 500 }, (_, i) => ({ value: `v${i}`, label: `L${i}` }))

		const { container } = renderUI(
			<div role="listbox" style={{ maxHeight: '200px', overflow: 'auto' }}>
				<ListboxVirtualOptions items={items} estimateSize={32}>
					{(o) => (
						<div key={o.value} role="option" tabIndex={-1}>
							{o.label}
						</div>
					)}
				</ListboxVirtualOptions>
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
