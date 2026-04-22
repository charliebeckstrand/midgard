import { describe, expect, it } from 'vitest'
import {
	Combobox,
	ComboboxLabel,
	ComboboxOption,
	ComboboxVirtualOptions,
} from '../../components/combobox'
import { bySlot, renderUI } from '../helpers'

describe('Combobox', () => {
	it('renders with data-slot="control"', () => {
		const { container } = renderUI(
			<Combobox>
				<div>Option</div>
			</Combobox>,
		)

		const el = bySlot(container, 'control')

		expect(el).toBeInTheDocument()
	})

	it('renders input with combobox role', () => {
		const { container } = renderUI(
			<Combobox>
				<div>Option</div>
			</Combobox>,
		)

		const input = bySlot(container, 'combobox-input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('role', 'combobox')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Combobox className="custom">
				<div>Option</div>
			</Combobox>,
		)

		const el = bySlot(container, 'control')

		expect(el?.className).toContain('custom')
	})

	it('renders placeholder text', () => {
		const { container } = renderUI(
			<Combobox placeholder="Type here">
				<div>Option</div>
			</Combobox>,
		)

		const input = bySlot(container, 'combobox-input')

		expect(input).toHaveAttribute('placeholder', 'Type here')
	})

	it('renders icon slot', () => {
		const { container } = renderUI(
			<Combobox>
				<div>Option</div>
			</Combobox>,
		)

		const icon = bySlot(container, 'icon')

		expect(icon).toBeInTheDocument()
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(
			<Combobox>
				<div>Option</div>
			</Combobox>,
			{ skeleton: true },
		)

		expect(bySlot(container, 'combobox-input')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('mounts virtualized options inside an open Combobox', () => {
		const options = Array.from({ length: 1_000 }, (_, i) => ({
			value: `v${i}`,
			label: `Option ${i}`,
		}))

		renderUI(
			<Combobox<string> open>
				<ComboboxVirtualOptions items={options} estimateSize={32}>
					{(o) => (
						<ComboboxOption key={o.value} value={o.value}>
							<ComboboxLabel>{o.label}</ComboboxLabel>
						</ComboboxOption>
					)}
				</ComboboxVirtualOptions>
			</Combobox>,
		)

		// Combobox renders its panel through FloatingPortal, so query document.
		// jsdom has no layout, so react-virtual renders 0 items — the assertion
		// is that the primitive mounts and the count is bounded.
		expect(bySlot(document.body, 'virtual-options')).toBeInTheDocument()
		expect(document.querySelectorAll('[role="option"]').length).toBeLessThanOrEqual(options.length)
	})
})
