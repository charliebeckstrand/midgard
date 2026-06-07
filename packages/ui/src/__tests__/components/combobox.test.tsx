import { describe, expect, it, vi } from 'vitest'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { ComboboxPanel } from '../../components/combobox/combobox-panel'
import { Control } from '../../components/control'
import { Description, Message } from '../../components/fieldset'
import { VirtualOptions } from '../../primitives/virtual-options'
import { bySlot, fireEvent, renderUI, screen, userEvent, within } from '../helpers'

describe('Combobox', () => {
	it('renders with data-slot="combobox"', () => {
		const { container } = renderUI(
			<Combobox>
				<div>Option</div>
			</Combobox>,
		)

		const el = bySlot(container, 'combobox')

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

		const el = bySlot(container, 'combobox')

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

	it.each([
		null,
		false,
		'',
	] as const)('falls back to the default chevron when suffix is %p', (value) => {
		const { container } = renderUI(
			<Combobox suffix={value}>
				<div>Option</div>
			</Combobox>,
		)

		const suffix = bySlot(container, 'suffix')

		expect(suffix).toBeInTheDocument()
		// The chevron is a decorative mouse affordance, not a second button — the
		// input carries the combobox semantics.
		expect(suffix).not.toHaveAttribute('role', 'button')
		expect(suffix).toHaveAttribute('aria-hidden', 'true')
		expect(suffix?.querySelector('[data-slot="icon"]')).toBeInTheDocument()
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

	it('shows a clear button only when clearable and a value is set', () => {
		const { container, rerender } = renderUI(
			<Combobox<string> clearable value="v1" displayValue={(v) => v}>
				<ComboboxOption value="v1">One</ComboboxOption>
			</Combobox>,
		)

		expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument()

		// No value → no clear affordance, falls back to the chevron suffix.
		rerender(
			<Combobox<string> clearable displayValue={(v) => v}>
				<ComboboxOption value="v1">One</ComboboxOption>
			</Combobox>,
		)

		expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument()

		expect(bySlot(container, 'suffix')).toHaveAttribute('aria-hidden', 'true')
	})

	it('clears a single selection and refocuses the input on clear', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Combobox<string> clearable value="v1" displayValue={(v) => v} onValueChange={onChange}>
				<ComboboxOption value="v1">One</ComboboxOption>
			</Combobox>,
		)

		const clear = screen.getByRole('button', { name: 'Clear selection' })

		// mousedown is swallowed so the trigger doesn't steal focus before the click lands.
		fireEvent.mouseDown(clear)

		fireEvent.click(clear)

		expect(onChange).toHaveBeenCalledWith(undefined)

		expect(document.activeElement).toBe(bySlot(container, 'combobox-input'))
	})

	it('clears a multiple selection to an empty array', () => {
		const onChange = vi.fn()

		renderUI(
			<Combobox<string> multiple clearable value={['v1']} onValueChange={onChange}>
				<ComboboxOption value="v1">One</ComboboxOption>
			</Combobox>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))

		expect(onChange).toHaveBeenCalledWith([])
	})

	it('mounts virtualized options inside an open Combobox', () => {
		const options = Array.from({ length: 1_000 }, (_, i) => ({
			value: `v${i}`,
			label: `Option ${i}`,
		}))

		renderUI(
			<Combobox<string> open>
				<VirtualOptions items={options} estimateSize={32}>
					{(o) => (
						<ComboboxOption key={o.value} value={o.value}>
							<ComboboxLabel>{o.label}</ComboboxLabel>
						</ComboboxOption>
					)}
				</VirtualOptions>
			</Combobox>,
		)

		// Combobox renders its panel through FloatingPortal, so query document.
		// jsdom has no layout, so react-virtual renders 0 items — the assertion
		// is that the primitive mounts and the count is bounded.
		expect(bySlot(document.body, 'virtual-options')).toBeInTheDocument()
		expect(document.querySelectorAll('[role="option"]').length).toBeLessThanOrEqual(options.length)
	})
})

// APG editable-combobox contract: DOM focus stays on the input while arrow keys
// move a *virtual* highlight, surfaced to assistive tech via the input's
// aria-activedescendant pointing at the active option's id — not by pulling
// focus onto the option.
describe('Combobox active-descendant keyboard model', () => {
	function renderTwoOptions() {
		return renderUI(
			<Combobox<string> displayValue={(v) => v} placeholder="Search">
				<ComboboxOption value="apple">
					<ComboboxLabel>Apple</ComboboxLabel>
				</ComboboxOption>
				<ComboboxOption value="apricot">
					<ComboboxLabel>Apricot</ComboboxLabel>
				</ComboboxOption>
			</Combobox>,
		)
	}

	it('keeps focus on the input and tracks the highlight via aria-activedescendant', async () => {
		const user = userEvent.setup()

		renderTwoOptions()

		const input = screen.getByRole('combobox')

		await user.click(input)

		await screen.findByRole('listbox')

		// Nothing is highlighted until the user navigates.
		expect(input).not.toHaveAttribute('aria-activedescendant')

		await user.keyboard('{ArrowDown}')

		// Focus never leaves the input.
		expect(document.activeElement).toBe(input)

		const activeId = input.getAttribute('aria-activedescendant')

		expect(activeId).toBeTruthy()

		const active = activeId ? document.getElementById(activeId) : null

		expect(active).toHaveAttribute('role', 'option')

		expect(active).toHaveAttribute('data-active')
	})

	it('clears aria-activedescendant when the menu closes', async () => {
		const user = userEvent.setup()

		renderTwoOptions()

		const input = screen.getByRole('combobox')

		await user.click(input)

		await screen.findByRole('listbox')

		await user.keyboard('{ArrowDown}')

		expect(input).toHaveAttribute('aria-activedescendant')

		await user.keyboard('{Escape}')

		expect(input).not.toHaveAttribute('aria-activedescendant')
	})
})

describe('ComboboxPanel', () => {
	function renderPanel(onClose: () => void) {
		return renderUI(
			<ComboboxPanel
				id="cb"
				open
				editing={false}
				glass={false}
				density="md"
				size="md"
				floatingStyles={{}}
				getFloatingProps={() => ({})}
				optionsRef={null}
				setFloating={() => {}}
				scrollToSelected={() => {}}
				flushPending={() => {}}
				onClose={onClose}
			>
				<div>panel child</div>
			</ComboboxPanel>,
		)
	}

	it('closes on Escape', () => {
		const onClose = vi.fn()

		renderPanel(onClose)

		fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })

		expect(onClose).toHaveBeenCalledTimes(1)
	})

	it('ignores non-Escape keys', () => {
		const onClose = vi.fn()

		renderPanel(onClose)

		fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })

		expect(onClose).not.toHaveBeenCalled()
	})

	// Regression: a role="listbox" may only own option/group children
	// (aria-required-children, WCAG 4.1.2), so the "No results" status message
	// must sit beside the listbox, not inside it. The id stays on the listbox so
	// the input's aria-controls still resolves to it.
	it('keeps the listbox owning only options, with the empty message a sibling', () => {
		renderUI(
			<ComboboxPanel
				id="cb"
				open
				editing={false}
				glass={false}
				density="md"
				size="md"
				floatingStyles={{}}
				getFloatingProps={() => ({})}
				optionsRef={null}
				setFloating={() => {}}
				scrollToSelected={() => {}}
				flushPending={() => {}}
				onClose={() => {}}
			>
				<div role="option" tabIndex={-1}>
					Alpha
				</div>
			</ComboboxPanel>,
		)

		const listbox = screen.getByRole('listbox')

		expect(listbox).toHaveAttribute('id', 'cb')

		expect(within(listbox).queryByText('No results')).not.toBeInTheDocument()

		const empty = screen.getByText('No results')

		expect(empty.tagName).toBe('OUTPUT')

		expect(listbox.contains(empty)).toBe(false)
	})
})

describe('Combobox + Control', () => {
	it('surfaces invalid state from an enclosing Control', () => {
		const { container } = renderUI(
			<Control invalid>
				<Combobox>
					<ComboboxOption value="a">
						<ComboboxLabel>A</ComboboxLabel>
					</ComboboxOption>
				</Combobox>
			</Control>,
		)

		const input = bySlot(container, 'combobox-input')

		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(input).toHaveAttribute('data-invalid')
	})

	it('inherits required from an enclosing Control', () => {
		const { container } = renderUI(
			<Control required>
				<Combobox>
					<ComboboxOption value="a">
						<ComboboxLabel>A</ComboboxLabel>
					</ComboboxOption>
				</Combobox>
			</Control>,
		)

		expect(bySlot(container, 'combobox-input')).toBeRequired()
	})

	it('points aria-describedby at the control description and message', () => {
		const { container } = renderUI(
			<Control id="status" invalid>
				<Description>Choose one</Description>
				<Combobox>
					<ComboboxOption value="a">
						<ComboboxLabel>A</ComboboxLabel>
					</ComboboxOption>
				</Combobox>
				<Message>Required</Message>
			</Control>,
		)

		const describedBy = bySlot(container, 'combobox-input')?.getAttribute('aria-describedby')

		expect(describedBy).toContain('status-description')

		expect(describedBy).toContain('status-error')
	})
})
