import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { ComboboxPanel } from '../../components/combobox/combobox-panel'
import { Control } from '../../components/control'
import { Description, Field, Label, Message } from '../../components/fieldset'
import { Form, useFormField } from '../../components/form'
import { VirtualOptions } from '../../primitives/virtual-options'
import { bySlot, fireEvent, renderUI, screen, userEvent, waitFor, within } from '../helpers'

describe('Combobox', () => {
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

	it('renders placeholder text', () => {
		const { container } = renderUI(
			<Combobox placeholder="Type here">
				<div>Option</div>
			</Combobox>,
		)

		const input = bySlot(container, 'combobox-input')

		expect(input).toHaveAttribute('placeholder', 'Type here')
	})

	it('names the input via aria-label', () => {
		const { container } = renderUI(
			<Combobox aria-label="City">
				<div>Option</div>
			</Combobox>,
		)

		expect(bySlot(container, 'combobox-input')).toHaveAttribute('aria-label', 'City')
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

		// The chevron is a decorative mouse affordance, not a second button; the
		// input carries the combobox semantics.
		expect(suffix).not.toHaveAttribute('role', 'button')

		expect(suffix).toHaveAttribute('aria-hidden', 'true')

		expect(suffix?.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('toggles the panel and shows a pointer cursor on the default chevron', async () => {
		const { container } = renderUI(
			<Combobox<string> displayValue={(v) => v}>
				<ComboboxOption value="a">A</ComboboxOption>
			</Combobox>,
		)

		const suffix = bySlot(container, 'suffix')

		// The chevron is a mouse-convenience affordance; cursor-pointer signals it.
		expect(suffix?.className).toContain('cursor-pointer')

		const icon = suffix?.querySelector<HTMLElement>('[data-slot="icon"]')

		if (!icon) throw new Error('default chevron icon not found')

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

		// mousedown (not click) carries the toggle so focus never leaves the input.
		fireEvent.mouseDown(icon)

		expect(screen.getByRole('listbox')).toBeInTheDocument()

		fireEvent.mouseDown(icon)

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
	})

	it('focuses the input and toggles the panel from a custom suffix', async () => {
		const { container } = renderUI(
			<Combobox<string> suffix={<span>pin</span>} displayValue={(v) => v}>
				<ComboboxOption value="a">A</ComboboxOption>
			</Combobox>,
		)

		const suffix = bySlot(container, 'suffix')

		if (!suffix) throw new Error('suffix slot not found')

		// Custom suffix content owns its semantics (e.g. a live LoadingSpinner);
		// only the default chevron is hidden wholesale.
		expect(suffix).not.toHaveAttribute('aria-hidden')

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

		fireEvent.mouseDown(suffix)

		expect(screen.getByRole('listbox')).toBeInTheDocument()

		expect(bySlot(container, 'combobox-input')).toHaveFocus()

		fireEvent.mouseDown(suffix)

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
	})

	it('threads the input name onto the open listbox', async () => {
		const { container } = renderUI(
			<Combobox<string> aria-label="City" displayValue={(v) => v}>
				<ComboboxOption value="a">A</ComboboxOption>
			</Combobox>,
		)

		const icon = bySlot(container, 'suffix')?.querySelector<HTMLElement>('[data-slot="icon"]')

		if (!icon) throw new Error('default chevron icon not found')

		fireEvent.mouseDown(icon)

		expect(screen.getByRole('listbox', { name: 'City' })).toBeInTheDocument()
	})

	it('names the listbox from a wrapping Field Label (no explicit aria-label)', async () => {
		const { container } = renderUI(
			<Field>
				<Label>City</Label>
				<Combobox<string> displayValue={(v) => v}>
					<ComboboxOption value="a">A</ComboboxOption>
				</Combobox>
			</Field>,
		)

		const icon = bySlot(container, 'suffix')?.querySelector<HTMLElement>('[data-slot="icon"]')

		if (!icon) throw new Error('default chevron icon not found')

		fireEvent.mouseDown(icon)

		expect(screen.getByRole('listbox', { name: 'City' })).toBeInTheDocument()
	})

	it('leaves the default chevron inert and not-allowed when disabled', () => {
		const { container } = renderUI(
			<Combobox<string> disabled displayValue={(v) => v}>
				<ComboboxOption value="a">A</ComboboxOption>
			</Combobox>,
		)

		const suffix = bySlot(container, 'suffix')

		const icon = suffix?.querySelector<HTMLElement>('[data-slot="icon"]')

		if (!icon) throw new Error('default chevron icon not found')

		fireEvent.mouseDown(icon)

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

		// The disabled input is a sibling, so the cursor flips via the frame group.
		expect(suffix?.className).toContain('group-has-[:disabled]/control:cursor-not-allowed')

		const frame = bySlot(container, 'control-frame')

		expect(frame?.contains(suffix ?? null)).toBe(true)

		expect(frame?.querySelector(':disabled')).toBe(bySlot(container, 'combobox-input'))
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

		// Panel is in FloatingPortal; query document. jsdom has no layout, so we
		// don't drive react-virtual's windowing (CONVENTIONS §10.3); we pin the
		// structural contract it relies on instead.
		const virtual = bySlot(document.body, 'virtual-options')

		expect(virtual).toBeInTheDocument()

		// VirtualOptions resolves its scroll parent via closest('[role="listbox"]');
		// the slot must mount inside the open listbox for that lookup to land.
		expect(virtual?.closest('[role="listbox"]')).toBe(screen.getByRole('listbox'))
	})
})

// APG editable-combobox contract: DOM focus stays on the input while arrow keys
// move a *virtual* highlight, surfaced to assistive tech via the input's
// aria-activedescendant pointing at the active option's id, not by pulling
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

		screen.getByRole('listbox')

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

	it('re-anchors the highlight when options swap under an unchanged query', async () => {
		const user = userEvent.setup()

		const { rerender } = renderUI(
			<Combobox<string> displayValue={(v) => v} placeholder="Search">
				<ComboboxOption key="apple" value="apple">
					<ComboboxLabel>Apple</ComboboxLabel>
				</ComboboxOption>
			</Combobox>,
		)

		const input = screen.getByRole('combobox')

		await user.click(input)

		screen.getByRole('listbox')

		await user.keyboard('{ArrowDown}')

		expect(input).toHaveAttribute('aria-activedescendant')

		// An async provider replaces the option set without the query changing
		// (e.g. address suggestions resolving); the highlighted node unmounts.
		rerender(
			<Combobox<string> displayValue={(v) => v} placeholder="Search">
				<ComboboxOption key="apricot" value="apricot">
					<ComboboxLabel>Apricot</ComboboxLabel>
				</ComboboxOption>
			</Combobox>,
		)

		// The reference must point at a mounted option, re-anchored to the top
		// match. Re-anchoring runs in a MutationObserver callback (a microtask
		// after the swap commits), so the assertions poll.
		await waitFor(() => {
			const activeId = input.getAttribute('aria-activedescendant')

			expect(activeId).toBeTruthy()

			const active = document.getElementById(activeId as string)

			expect(active).toHaveAttribute('role', 'option')

			expect(active).toHaveAttribute('data-active')
		})
	})

	it('clears aria-activedescendant when the menu closes', async () => {
		const user = userEvent.setup()

		renderTwoOptions()

		const input = screen.getByRole('combobox')

		await user.click(input)

		screen.getByRole('listbox')

		await user.keyboard('{ArrowDown}')

		expect(input).toHaveAttribute('aria-activedescendant')

		await user.keyboard('{Escape}')

		expect(input).not.toHaveAttribute('aria-activedescendant')
	})

	it('reopens the closed menu on ArrowDown while the input stays focused', async () => {
		const user = userEvent.setup()

		renderTwoOptions()

		const input = screen.getByRole('combobox')

		await user.click(input)

		screen.getByRole('listbox')

		// Escape closes the menu but leaves focus on the input.
		await user.keyboard('{Escape}')

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

		expect(document.activeElement).toBe(input)

		// ArrowDown reopens it (APG: Down Arrow opens the listbox) without the
		// chevron, the only prior reopen affordance.
		await user.keyboard('{ArrowDown}')

		expect(screen.getByRole('listbox')).toBeInTheDocument()
	})

	it('seats the highlight on the selected option when ArrowDown reopens a single-mode menu', async () => {
		const user = userEvent.setup()

		renderTwoOptions()

		const input = screen.getByRole('combobox')

		await user.click(input)

		screen.getByRole('listbox')

		// Select Apricot; single-mode closeOnSelect closes the menu but keeps focus.
		await user.click(screen.getByRole('option', { name: 'Apricot' }))

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

		expect(document.activeElement).toBe(input)

		// Reopening with ArrowDown lands the highlight on the current selection,
		// not an empty highlight: the first Down keeps the user on their value.
		await user.keyboard('{ArrowDown}')

		screen.getByRole('listbox')

		const activeId = input.getAttribute('aria-activedescendant')

		expect(activeId).toBeTruthy()

		expect(document.getElementById(activeId as string)).toBe(
			screen.getByRole('option', { name: 'Apricot' }),
		)

		const selected = screen.getByRole('option', { name: 'Apricot' })

		expect(selected).toHaveAttribute('data-selected')

		expect(selected).toHaveAttribute('data-active')
	})

	it('opens the closed menu on ArrowUp once the caret sits at the text start', async () => {
		const user = userEvent.setup()

		renderTwoOptions()

		const input = screen.getByRole('combobox') as HTMLInputElement

		await user.click(input)

		screen.getByRole('listbox')

		// Select Apricot; the menu closes, focus stays, and the caret lands at the
		// end of the displayed value.
		await user.click(screen.getByRole('option', { name: 'Apricot' }))

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

		// ArrowUp from anywhere but the start belongs to the textbox (caret to start),
		// so the menu stays closed.
		input.setSelectionRange(input.value.length, input.value.length)

		expect(fireEvent.keyDown(input, { key: 'ArrowUp' })).toBe(true)

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

		// From the start, ArrowUp opens the menu (APG editable combobox).
		input.setSelectionRange(0, 0)

		fireEvent.keyDown(input, { key: 'ArrowUp' })

		expect(screen.getByRole('listbox')).toBeInTheDocument()
	})

	it('leaves ArrowDown to the textbox while the caret sits mid-value', async () => {
		const user = userEvent.setup()

		renderTwoOptions()

		const input = screen.getByRole('combobox') as HTMLInputElement

		await user.click(input)

		screen.getByRole('listbox')

		await user.click(screen.getByRole('option', { name: 'Apricot' }))

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

		// Caret mid-value: ArrowDown moves it to the end natively (default not
		// prevented) rather than opening the menu.
		input.setSelectionRange(1, 1)

		expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(true)

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
	})

	// Clicking an option must not pull focus off the input; otherwise single-select
	// (which closes on select) would drop focus to <body> when the panel unmounts.
	it('keeps focus on the input when an option is clicked', async () => {
		const user = userEvent.setup()

		const onChange = vi.fn()

		renderUI(
			<Combobox<string> displayValue={(v) => v} placeholder="Search" onValueChange={onChange}>
				<ComboboxOption value="apple">
					<ComboboxLabel>Apple</ComboboxLabel>
				</ComboboxOption>
				<ComboboxOption value="apricot">
					<ComboboxLabel>Apricot</ComboboxLabel>
				</ComboboxOption>
			</Combobox>,
		)

		const input = screen.getByRole('combobox')

		await user.click(input)

		screen.getByRole('listbox')

		await user.click(screen.getByRole('option', { name: 'Apple' }))

		expect(onChange).toHaveBeenCalledWith('apple')

		expect(document.activeElement).toBe(input)
	})

	// Regression: a controlled value cleared back to `undefined` flipped
	// useControllable to uncontrolled, resurfacing the stale internal value;
	// deselecting then took two clicks.
	it('deselects a nullable controlled selection on the first click', async () => {
		const user = userEvent.setup()

		function ControlledNullable() {
			const [selected, setSelected] = useState<string | undefined>(undefined)

			return (
				<Combobox<string>
					nullable
					value={selected}
					onValueChange={setSelected}
					displayValue={(v) => v}
				>
					<ComboboxOption value="apple">
						<ComboboxLabel>Apple</ComboboxLabel>
					</ComboboxOption>
				</Combobox>
			)
		}

		const { container } = renderUI(<ControlledNullable />)

		const input = screen.getByRole('combobox')

		await user.click(input)

		screen.getByRole('listbox')

		await user.click(screen.getByRole('option', { name: 'Apple' }))

		expect(input).toHaveValue('apple')

		// Focus stayed on the input, so reopen via the chevron.
		const icon = bySlot(container, 'suffix')?.querySelector<HTMLElement>('[data-slot="icon"]')

		if (!icon) throw new Error('default chevron icon not found')

		fireEvent.mouseDown(icon)

		screen.getByRole('listbox')

		await user.click(screen.getByRole('option', { name: 'Apple' }))

		expect(input).toHaveValue('')
	})

	it('binds the selected value to a Form field by name', async () => {
		const user = userEvent.setup()

		const onSubmit = vi.fn()

		renderUI(
			<Form defaultValues={{ fruit: undefined }} onSubmit={onSubmit}>
				<Combobox<string> name="fruit" displayValue={(v) => v} placeholder="Search">
					<ComboboxOption value="apple">
						<ComboboxLabel>Apple</ComboboxLabel>
					</ComboboxOption>
				</Combobox>
				<button type="submit">Submit</button>
			</Form>,
		)

		await user.click(screen.getByRole('combobox'))

		screen.getByRole('listbox')

		await user.click(screen.getByRole('option', { name: 'Apple' }))

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ fruit: 'apple' }),
			expect.anything(),
		)
	})

	// The panel half of the condition (focus moving *into* the floating panel
	// does not touch) is pinned in use-combobox-input.test.ts: the global
	// floating-ui mock keeps `refs.floating` empty, so the containment guard
	// is unreachable from the rendered component.
	it('marks the form field touched when focus leaves the combobox', async () => {
		const user = userEvent.setup()

		function TouchedProbe() {
			const field = useFormField('fruit')

			return <span data-testid="touched">{field?.touched ? 'touched' : 'untouched'}</span>
		}

		renderUI(
			<Form defaultValues={{ fruit: undefined }}>
				<Combobox<string> name="fruit" displayValue={(v) => v} placeholder="Search">
					<ComboboxOption value="apple">
						<ComboboxLabel>Apple</ComboboxLabel>
					</ComboboxOption>
				</Combobox>
				<TouchedProbe />
			</Form>,
		)

		const input = screen.getByRole('combobox')

		await user.click(input)

		screen.getByRole('listbox')

		expect(screen.getByTestId('touched').textContent).toBe('untouched')

		await user.tab()

		expect(screen.getByTestId('touched').textContent).toBe('touched')
	})
})

// aria-selected stays the stored value; a multi-select listbox must declare
// aria-multiselectable for AT to interpret multiple selected options correctly.
describe('Combobox listbox selection semantics', () => {
	async function openListbox(multiple: boolean) {
		const user = userEvent.setup()

		renderUI(
			<Combobox<string> multiple={multiple} placeholder="Search">
				<ComboboxOption value="apple">
					<ComboboxLabel>Apple</ComboboxLabel>
				</ComboboxOption>
			</Combobox>,
		)

		await user.click(screen.getByRole('combobox'))

		return screen.getByRole('listbox')
	}

	it('marks the listbox aria-multiselectable when multiple', async () => {
		const listbox = await openListbox(true)

		expect(listbox).toHaveAttribute('aria-multiselectable', 'true')
	})

	it('omits aria-multiselectable for single select', async () => {
		const listbox = await openListbox(false)

		expect(listbox).not.toHaveAttribute('aria-multiselectable')
	})
})

describe('ComboboxPanel', () => {
	function renderPanel(onClose: () => void) {
		return renderUI(
			<ComboboxPanel
				id="cb"
				open
				editing={false}
				multiple={false}
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

	// role="listbox" may only own option/group children (aria-required-children,
	// WCAG 4.1.2); the "No results" status message sits beside the listbox, not
	// inside it. The id stays on the listbox so aria-controls resolves correctly.
	it('keeps the listbox owning only options, with the empty message a sibling', () => {
		renderUI(
			<ComboboxPanel
				id="cb"
				open
				editing={false}
				multiple={false}
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

describe('Combobox required', () => {
	it('surfaces required and aria-required on the input from the prop', () => {
		const { container } = renderUI(
			<Combobox required aria-label="City">
				<ComboboxOption value="a">A</ComboboxOption>
			</Combobox>,
		)

		const input = bySlot(container, 'combobox-input') as HTMLInputElement

		expect(input).toBeRequired()

		expect(input).toHaveAttribute('aria-required', 'true')
	})

	it('resolves required from an enclosing Control', () => {
		const { container } = renderUI(
			<Control required>
				<Combobox aria-label="City">
					<ComboboxOption value="a">A</ComboboxOption>
				</Combobox>
			</Control>,
		)

		expect(bySlot(container, 'combobox-input')).toHaveAttribute('aria-required', 'true')
	})
})

describe('Combobox readOnly', () => {
	const chevron = (container: HTMLElement) =>
		bySlot(container, 'suffix')?.querySelector<HTMLElement>('[data-slot="icon"]') as HTMLElement

	it('marks the input read-only without disabling it', () => {
		const { container } = renderUI(
			<Combobox readOnly aria-label="City">
				<ComboboxOption value="a">A</ComboboxOption>
			</Combobox>,
		)

		const input = bySlot(container, 'combobox-input') as HTMLInputElement

		expect(input).toHaveAttribute('readonly')

		expect(input).toHaveAttribute('aria-readonly', 'true')

		// Read-only stays focusable (unlike disabled).
		expect(input).not.toBeDisabled()
	})

	it('does not open the menu via the chevron or keyboard while read-only', () => {
		const { container } = renderUI(
			<Combobox readOnly aria-label="City">
				<ComboboxOption value="a">A</ComboboxOption>
			</Combobox>,
		)

		fireEvent.mouseDown(chevron(container))

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

		fireEvent.keyDown(bySlot(container, 'combobox-input') as HTMLElement, { key: 'ArrowDown' })

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
	})

	it('resolves readOnly from an enclosing Control', () => {
		const { container } = renderUI(
			<Control readOnly>
				<Combobox aria-label="City">
					<ComboboxOption value="a">A</ComboboxOption>
				</Combobox>
			</Control>,
		)

		expect(bySlot(container, 'combobox-input')).toHaveAttribute('aria-readonly', 'true')
	})

	it('still submits the bound value through a Form', async () => {
		const onSubmit = vi.fn()

		renderUI(
			<Form defaultValues={{ city: 'paris' }} onSubmit={onSubmit}>
				<Combobox readOnly name="city" aria-label="City" displayValue={(v) => String(v)}>
					<ComboboxOption value="paris">Paris</ComboboxOption>
				</Combobox>
				<button type="submit">Submit</button>
			</Form>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

		await waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({ city: 'paris' }),
				expect.anything(),
			),
		)
	})
})
