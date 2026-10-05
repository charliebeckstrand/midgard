import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import {
	type HighlightOrigin,
	reanchorOnOptionSwap,
	seatOnArrowOpen,
} from '../../components/combobox/combobox'
import { ComboboxPanel } from '../../components/combobox/combobox-panel'
import { Control } from '../../components/control'
import { Description, Field, Fieldset, Label, Message } from '../../components/fieldset'
import { Form } from '../../components/form'
import type { VirtualItemSource } from '../../hooks/a11y/use-a11y-roving'
import { VirtualOptions } from '../../primitives/virtual-options'
import { NO_HOVER_QUERY } from '../../utilities/media-query'
import {
	act,
	attach,
	bySlot,
	fireEvent,
	getSlot,
	mockDomGeometry,
	present,
	renderUI,
	screen,
	setupUser,
	stubMatchMedia,
	waitFor,
	within,
} from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

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

	it('names the input via aria-labelledby, and describes it via aria-describedby', () => {
		const { container } = renderUI(
			<>
				<span id="city-label">City</span>
				<span id="city-hint">Start typing</span>
				<Combobox aria-labelledby="city-label" aria-describedby="city-hint">
					<div>Option</div>
				</Combobox>
			</>,
		)

		const input = bySlot(container, 'combobox-input')

		expect(input).toHaveAttribute('aria-labelledby', 'city-label')

		expect(input).toHaveAttribute('aria-describedby', 'city-hint')
	})

	it('names the listbox from aria-labelledby when no aria-label is given', async () => {
		const user = setupUser()

		renderUI(
			<>
				<span id="city-label">City</span>
				<Combobox aria-labelledby="city-label">
					<ComboboxOption value="a">
						<ComboboxLabel>A</ComboboxLabel>
					</ComboboxOption>
				</Combobox>
			</>,
		)

		await user.click(screen.getByRole('combobox'))

		expect(screen.getByRole('listbox')).toHaveAttribute('aria-labelledby', 'city-label')
	})

	it.each([null, false, ''] as const)(
		'falls back to the default chevron when suffix is %p',
		(value) => {
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
		},
	)

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

	it('gives the panel chrome no role around the listbox', () => {
		const { container } = renderUI(
			<Combobox<string> displayValue={(v) => v}>
				<ComboboxOption value="a">A</ComboboxOption>
			</Combobox>,
		)

		const suffix = getSlot(container, 'suffix')

		fireEvent.mouseDown(suffix)

		const panel = present(
			screen.getByRole('listbox').closest<HTMLElement>('[data-slot="popover-panel"]'),
			'popover-panel',
		)

		// An unnamed `group` adds a nameless container to the accessibility tree.
		expect(panel).not.toHaveAttribute('role')

		expect(screen.queryByRole('group')).toBeNull()
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

		// The suffix slot around the button opens the menu on mousedown. The button
		// stops the press there, so the menu stays shut.
		fireEvent.mouseDown(clear)

		expect(getSlot(container, 'combobox-input')).toHaveAttribute('aria-expanded', 'false')

		fireEvent.click(clear)

		// §7.3: a cleared single selection reports `null` (controlled with no
		// value), not `undefined` (which would read as uncontrolled if echoed).
		expect(onChange).toHaveBeenCalledWith(null)

		expect(document.activeElement).toBe(bySlot(container, 'combobox-input'))
	})

	it('hands onClear the input instead of refocusing it', () => {
		const onClear = vi.fn<(input: HTMLInputElement | null) => void>()

		// The one-liner the prop exists for: leave the field, so the clear doesn't
		// reopen the list it just emptied.
		const { container } = renderUI(
			<Combobox<string>
				clearable
				value="v1"
				displayValue={(v) => v}
				onClear={(input) => {
					onClear(input)

					input?.blur()
				}}
			>
				<ComboboxOption value="v1">One</ComboboxOption>
			</Combobox>,
		)

		const input = bySlot(container, 'combobox-input')

		// Focused first, as a user who typed or tabbed into the field would be. Wrapped,
		// because focus opens the menu — the state update the clear is about to undo.
		act(() => {
			input?.focus()
		})

		fireEvent.mouseDown(screen.getByRole('button', { name: 'Clear selection' }))

		fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))

		// The combobox's own input, so a consumer needs no ref of its own.
		expect(onClear).toHaveBeenCalledWith(input)

		expect(document.activeElement).not.toBe(input)

		expect(input).toHaveAttribute('aria-expanded', 'false')

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
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
		const user = setupUser()

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
		const user = setupUser()

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

	// Async rows, such as address suggestions, arrive after the query changed. The
	// seed of the filter change found no row, so the first row that mounts takes it.
	// Enter then picks that row and does not submit the form.
	it('highlights the top match when rows arrive after a filter change that found none', async () => {
		const user = setupUser()

		const { rerender } = renderUI(
			<Combobox<string> displayValue={(v) => v} placeholder="Search">
				{null}
			</Combobox>,
		)

		const input = screen.getByRole('combobox')

		await user.type(input, 'ap')

		expect(input).not.toHaveAttribute('aria-activedescendant')

		rerender(
			<Combobox<string> displayValue={(v) => v} placeholder="Search">
				<ComboboxOption value="apple">
					<ComboboxLabel>Apple</ComboboxLabel>
				</ComboboxOption>
			</Combobox>,
		)

		const apple = screen.getByRole('option', { name: 'Apple' })

		await waitFor(() => expect(input).toHaveAttribute('aria-activedescendant', apple.id))

		expect(apple).toHaveAttribute('data-active')
	})

	// A seeded highlight follows the top match, but an arrow key makes the
	// highlight the user's. A new top match then does not take it.
	it('keeps a highlight that an arrow key moved when a new top match mounts', async () => {
		const user = setupUser()

		const fruits = (labels: string[]) => (
			<Combobox<string> displayValue={(v) => v} placeholder="Search">
				{labels.map((label) => (
					<ComboboxOption key={label} value={label}>
						<ComboboxLabel>{label}</ComboboxLabel>
					</ComboboxOption>
				))}
			</Combobox>
		)

		const { rerender } = renderUI(fruits(['Apple', 'Apricot']))

		const input = screen.getByRole('combobox')

		await user.type(input, 'ap')

		await user.keyboard('{ArrowDown}')

		const apricot = screen.getByRole('option', { name: 'Apricot' })

		expect(input).toHaveAttribute('aria-activedescendant', apricot.id)

		rerender(fruits(['Ape', 'Apple', 'Apricot']))

		// The observer runs in a microtask after the commit.
		await act(async () => {})

		expect(input).toHaveAttribute('aria-activedescendant', apricot.id)

		expect(apricot).toHaveAttribute('data-active')
	})

	it('moves the highlight to the top match when the query changes', async () => {
		const user = setupUser()

		renderTwoOptions()

		const input = screen.getByRole('combobox')

		await user.type(input, 'ap')

		const [first] = screen.getAllByRole('option')

		expect(first).toHaveAttribute('data-active')

		expect(input).toHaveAttribute('aria-activedescendant', first?.id)
	})

	// A phone has no hover. The reader taps an option there, so a highlight on the
	// top match looks like an option that they picked.
	it('leaves the highlight clear when the query changes on a device with no hover', async () => {
		stubMatchMedia((query) => query === NO_HOVER_QUERY)

		const user = setupUser()

		renderTwoOptions()

		const input = screen.getByRole('combobox')

		await user.type(input, 'ap')

		const options = screen.getAllByRole('option')

		expect(input).not.toHaveAttribute('aria-activedescendant')

		for (const option of options) expect(option).not.toHaveAttribute('data-active')

		// An arrow key still sets the highlight, on the first option.
		await user.keyboard('{ArrowDown}')

		expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id)
	})

	it('clears aria-activedescendant when the menu closes', async () => {
		const user = setupUser()

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
		const user = setupUser()

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

	// A pick keeps focus on the input, so a click that follows gets no focus event
	// to open the menu from. The press on the focused input must open it.
	it('reopens the closed menu on a click after a selection', async () => {
		const user = setupUser()

		renderTwoOptions()

		const input = screen.getByRole('combobox')

		await user.click(input)

		await user.click(screen.getByRole('option', { name: 'Apricot' }))

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

		expect(document.activeElement).toBe(input)

		await user.click(input)

		expect(screen.getByRole('listbox')).toBeInTheDocument()
	})

	it('reopens the menu on a click after Escape closes it', async () => {
		const user = setupUser()

		renderTwoOptions()

		const input = screen.getByRole('combobox')

		await user.click(input)

		await user.keyboard('{Escape}')

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

		await user.click(input)

		expect(screen.getByRole('listbox')).toBeInTheDocument()
	})

	it('keeps the menu open on a click into the input while it is open', async () => {
		const user = setupUser()

		renderTwoOptions()

		const input = screen.getByRole('combobox')

		await user.click(input)

		await user.click(input)

		expect(screen.getByRole('listbox')).toBeInTheDocument()
	})

	it('seats the highlight on the selected option when ArrowDown reopens a single-mode menu', async () => {
		const user = setupUser()

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
		const user = setupUser()

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
		const user = setupUser()

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
		const user = setupUser()

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
		const user = setupUser()

		function ControlledNullable() {
			const [selected, setSelected] = useState<string | null>(null)

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

		// `capitalize` defaults on, so the resolved display value renders
		// first-word-capitalized in the input's DOM value (the underlying
		// selection stays 'apple').
		expect(input).toHaveValue('Apple')

		// Focus stayed on the input, so reopen via the chevron.
		const icon = bySlot(container, 'suffix')?.querySelector<HTMLElement>('[data-slot="icon"]')

		if (!icon) throw new Error('default chevron icon not found')

		fireEvent.mouseDown(icon)

		screen.getByRole('listbox')

		await user.click(screen.getByRole('option', { name: 'Apple' }))

		expect(input).toHaveValue('')
	})

	it('binds the selected value to a Form field by name', async () => {
		const user = setupUser()

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
		const user = setupUser()

		renderUI(
			<Form defaultValues={{ fruit: undefined }}>
				<Combobox<string> name="fruit" displayValue={(v) => v} placeholder="Search">
					<ComboboxOption value="apple">
						<ComboboxLabel>Apple</ComboboxLabel>
					</ComboboxOption>
				</Combobox>
				<FieldProbe name="fruit" />
			</Form>,
		)

		const input = screen.getByRole('combobox')

		await user.click(input)

		screen.getByRole('listbox')

		expect(getFieldProbe('fruit')).toHaveAttribute('data-touched', 'false')

		await user.tab()

		expect(getFieldProbe('fruit')).toHaveAttribute('data-touched', 'true')
	})
})

// The seam of the observer that re-anchors the highlight. A plain-object source
// takes the place of the one that `VirtualOptions` registers, so no virtualizer
// runs (CONVENTIONS §10.3).
describe('reanchorOnOptionSwap', () => {
	let lists = 0

	/** An attached list of option rows and its input, as the panel and the trigger hold them. */
	function makeList(labels: string[]) {
		const scope = `reanchor-${lists++}`

		const node = attach(document.createElement('div'))

		const rows = labels.map((label) => {
			const row = document.createElement('div')

			row.setAttribute('role', 'option')

			row.id = `${scope}-${label}`

			node.append(row)

			return row
		})

		const input = attach(document.createElement('input'))

		return { node, rows, input }
	}

	function makeSource(count: number): VirtualItemSource {
		return { count, getKey: (index) => `opt-${index}`, scrollToIndex: vi.fn() }
	}

	/** Puts the highlight on `row`, as a seed or an arrow key does. */
	function highlight(input: HTMLInputElement, row: HTMLElement) {
		row.setAttribute('data-active', '')

		input.setAttribute('aria-activedescendant', row.id)
	}

	function reanchor(
		node: HTMLElement,
		input: HTMLInputElement,
		options: { origin: HighlightOrigin; source?: VirtualItemSource; activeIndex?: number },
	) {
		const activeIndexRef = { current: options.activeIndex ?? -1 }

		const originRef = { current: options.origin }

		reanchorOnOptionSwap(
			node,
			{ current: options.source ?? null },
			activeIndexRef,
			{ current: input },
			originRef,
		)

		return { activeIndexRef, originRef }
	}

	// A plain open leaves the highlight empty. A scroll changes the rows of the
	// window, and that must not seed row 0, scroll back to it, and arm Enter.
	it('keeps an empty highlight empty when the window of a source changes', () => {
		const { node, input } = makeList([])

		const source = makeSource(50)

		const { activeIndexRef } = reanchor(node, input, { origin: 'empty', source })

		expect(activeIndexRef.current).toBe(-1)

		expect(input).not.toHaveAttribute('aria-activedescendant')

		expect(source.scrollToIndex).not.toHaveBeenCalled()
	})

	it('seeds the top match when rows mount after a filter change that seeded nothing', () => {
		const { node, rows, input } = makeList(['apple', 'apricot'])

		reanchor(node, input, { origin: 'seeded' })

		expect(input).toHaveAttribute('aria-activedescendant', rows[0]?.id)

		expect(rows[0]).toHaveAttribute('data-active')
	})

	it('seeds the top match of a source after a filter change that seeded nothing', () => {
		const { node, input } = makeList([])

		const { activeIndexRef } = reanchor(node, input, { origin: 'seeded', source: makeSource(50) })

		expect(activeIndexRef.current).toBe(0)

		expect(input).toHaveAttribute('aria-activedescendant', 'opt-0')
	})

	// The create row goes after the matches, so a match that mounts is the new top.
	it('moves a seeded highlight to a new top match that mounts above it', () => {
		const { node, rows, input } = makeList(['apple', 'create'])

		const [apple, create] = rows

		highlight(input, create as HTMLElement)

		reanchor(node, input, { origin: 'seeded' })

		expect(input).toHaveAttribute('aria-activedescendant', apple?.id)

		expect(apple).toHaveAttribute('data-active')

		expect(create).not.toHaveAttribute('data-active')
	})

	// A result set with no match empties the list. The next result set must get
	// the top match again.
	it('seeds the next rows after the swap that dropped the row of the highlight', () => {
		const { node, rows, input } = makeList(['old'])

		highlight(input, rows[0] as HTMLElement)

		rows[0]?.remove()

		const { originRef } = reanchor(node, input, { origin: 'moved' })

		expect(input).not.toHaveAttribute('aria-activedescendant')

		expect(originRef.current).toBe('seeded')

		const next = document.createElement('div')

		next.setAttribute('role', 'option')

		next.id = `${rows[0]?.id}-next`

		node.append(next)

		reanchorOnOptionSwap(node, { current: null }, { current: -1 }, { current: input }, originRef)

		expect(input).toHaveAttribute('aria-activedescendant', next.id)
	})

	it('keeps a highlight that the user moved while its row stays', () => {
		const { node, rows, input } = makeList(['apple', 'apricot'])

		highlight(input, rows[1] as HTMLElement)

		const { originRef } = reanchor(node, input, { origin: 'moved' })

		expect(input).toHaveAttribute('aria-activedescendant', rows[1]?.id)

		expect(rows[0]).not.toHaveAttribute('data-active')

		expect(originRef.current).toBe('moved')
	})

	it('keeps a highlight that the user moved inside the count of a source', () => {
		const { node, input } = makeList([])

		const source = makeSource(50)

		const { activeIndexRef } = reanchor(node, input, { origin: 'moved', source, activeIndex: 3 })

		expect(activeIndexRef.current).toBe(3)

		expect(source.scrollToIndex).not.toHaveBeenCalled()
	})

	it('leaves a seeded highlight clear on a device with no hover', () => {
		stubMatchMedia((query) => query === NO_HOVER_QUERY)

		const { node, rows, input } = makeList(['apple'])

		reanchor(node, input, { origin: 'seeded' })

		expect(input).not.toHaveAttribute('aria-activedescendant')

		expect(rows[0]).not.toHaveAttribute('data-active')
	})

	// The seed passes over a disabled top row. When the window changes, the
	// highlight on the next row is still the top match, so the list does not
	// scroll back to it.
	it('keeps a seeded highlight on the first enabled index of a source', () => {
		const { node, input } = makeList([])

		const source: VirtualItemSource = { ...makeSource(50), isDisabled: (index) => index === 0 }

		input.setAttribute('aria-activedescendant', 'opt-1')

		const { activeIndexRef } = reanchor(node, input, { origin: 'seeded', source, activeIndex: 1 })

		expect(activeIndexRef.current).toBe(1)

		expect(source.scrollToIndex).not.toHaveBeenCalled()
	})
})

// The seam of the arrow-key open under a registered source. A plain-object
// source takes the place of the one that `VirtualOptions` registers, so no
// virtualizer runs (CONVENTIONS §10.3).
describe('seatOnArrowOpen', () => {
	function seat(isDisabled: (index: number) => boolean) {
		const node = attach(document.createElement('div'))

		const input = attach(document.createElement('input'))

		const source: VirtualItemSource = {
			count: 3,
			getKey: (index) => `seat-${index}`,
			isDisabled,
			scrollToIndex: vi.fn(),
		}

		const activeIndexRef = { current: -1 }

		seatOnArrowOpen(node, source, false, activeIndexRef, { current: input })

		return { input, activeIndexRef }
	}

	// Enter clicks the seated row, and a disabled option drops the click.
	it('seats the first enabled index of a source', () => {
		const { input, activeIndexRef } = seat((index) => index === 0)

		expect(activeIndexRef.current).toBe(1)

		expect(input).toHaveAttribute('aria-activedescendant', 'seat-1')
	})

	it('seats no index when the source holds no enabled index', () => {
		const { input, activeIndexRef } = seat(() => true)

		expect(activeIndexRef.current).toBe(-1)

		expect(input).not.toHaveAttribute('aria-activedescendant')
	})
})

// aria-selected stays the stored value; a multi-select listbox must declare
// aria-multiselectable for AT to interpret multiple selected options correctly.
describe('Combobox listbox selection semantics', () => {
	async function openListbox(multiple: boolean) {
		const user = setupUser()

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

// A multiple pick ends editing, and the re-render writes the resting display
// into the input. A write of a different value moves the caret to the end and
// clears the text selection. The selection must come after that write, or the
// next key appends to the display and searches for "Texasu".
describe('Combobox multiple pick', () => {
	it('selects the resting display that the pick writes, so the next key replaces it', async () => {
		const user = setupUser()

		renderUI(
			<Combobox<string> multiple displayValue={(v) => v} placeholder="Search">
				<ComboboxOption value="texas">
					<ComboboxLabel>Texas</ComboboxLabel>
				</ComboboxOption>
				<ComboboxOption value="utah">
					<ComboboxLabel>Utah</ComboboxLabel>
				</ComboboxOption>
			</Combobox>,
		)

		const input = screen.getByRole<HTMLInputElement>('combobox')

		await user.click(input)

		await user.click(screen.getByRole('option', { name: 'Texas' }))

		expect(input).toHaveValue('Texas')

		expect(document.activeElement).toBe(input)

		expect([input.selectionStart, input.selectionEnd]).toEqual([0, 'Texas'.length])

		await user.keyboard('u')

		expect(input).toHaveValue('u')
	})
})

// The `capitalize` default formats string option labels in JS at render, so
// the accessible name matches the visual: first word only, rest untouched.
describe('Combobox capitalize', () => {
	it('capitalizes only the first word of a string option label', () => {
		renderUI(
			<Combobox<string> open>
				<ComboboxOption value="a">
					<ComboboxLabel>red apple</ComboboxLabel>
				</ComboboxOption>
			</Combobox>,
		)

		expect(screen.getByRole('option', { name: 'Red apple' })).toBeInTheDocument()
	})

	it('renders string option labels as authored when capitalize is off', () => {
		renderUI(
			<Combobox<string> open capitalize={false}>
				<ComboboxOption value="a">
					<ComboboxLabel>red apple</ComboboxLabel>
				</ComboboxOption>
			</Combobox>,
		)

		expect(screen.getByRole('option', { name: 'red apple' })).toBeInTheDocument()
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

	// With the compiler off, a new callback ref on each render detaches and
	// attaches again at each commit. Each keystroke then scrolls the selected row
	// back into view.
	it('attaches the floating node and scrolls to the selection once for each mount', () => {
		const setFloating = vi.fn()

		const scrollToSelected = vi.fn()

		const panel = (editing: boolean) => (
			<ComboboxPanel
				id="cb"
				open
				editing={editing}
				multiple={false}
				glass={false}
				size="md"
				floatingStyles={{}}
				getFloatingProps={() => ({})}
				optionsRef={null}
				setFloating={setFloating}
				scrollToSelected={scrollToSelected}
				flushPending={() => {}}
				onClose={() => {}}
			>
				<div>panel child</div>
			</ComboboxPanel>
		)

		const { rerender } = renderUI(panel(false))

		rerender(panel(true))

		rerender(panel(false))

		expect(scrollToSelected).toHaveBeenCalledTimes(1)

		expect(scrollToSelected).toHaveBeenCalledWith(expect.any(HTMLDivElement))

		expect(setFloating).toHaveBeenCalledTimes(1)
	})

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

	// DOM focus stays on the input (active descendant). A press on the panel chrome
	// must not move focus into the panel, because the input then gets no keys.
	it('cancels a press on the panel chrome outside an option row', () => {
		renderPanel(() => {})

		expect(fireEvent.mouseDown(screen.getByText('No results'))).toBe(false)

		expect(fireEvent.mouseDown(screen.getByRole('listbox'))).toBe(false)

		expect(fireEvent.mouseDown(getSlot(document.body, 'popover-panel'))).toBe(false)
	})

	it('leaves a press on the panel scrollbar uncanceled', () => {
		renderPanel(() => {})

		const panel = getSlot(document.body, 'popover-panel')

		// jsdom does no layout, so the panel gets a vertical overflow from stubs.
		panel.style.overflowY = 'auto'

		mockDomGeometry(panel, {
			clientWidth: 100,
			clientHeight: 100,
			scrollWidth: 100,
			scrollHeight: 500,
		})

		const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

		Object.defineProperty(press, 'offsetX', { value: 110 })

		Object.defineProperty(press, 'offsetY', { value: 50 })

		expect(panel.dispatchEvent(press)).toBe(true)
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
			<Control severity="error">
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

	it('points aria-describedby at the control description and message', () => {
		const { container } = renderUI(
			<Control id="status" severity="error">
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

		const input = getSlot<HTMLInputElement>(container, 'combobox-input')

		expect(input).toBeRequired()

		expect(input).toHaveAttribute('aria-required', 'true')
	})

	// B04-C03: with no `displayValue`, a selection leaves the text input empty.
	// The selection satisfies the field, so the native check must pass.
	it('passes the native required check with a selection and an empty input', () => {
		const { container } = renderUI(
			<form>
				<Combobox required aria-label="City" defaultValue="a">
					<ComboboxOption value="a">A</ComboboxOption>
				</Combobox>
			</form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'combobox-input')

		expect(input.value).toBe('')

		expect(input.checkValidity()).toBe(true)

		expect(input).toHaveAttribute('aria-required', 'true')
	})

	// A typed query is not a selection. The input must stay natively invalid while it
	// shows text and nothing is selected.
	it('fails the native required check with typed text and no selection', async () => {
		const user = setupUser()

		const { container } = renderUI(
			<form>
				<Combobox required aria-label="City">
					<ComboboxOption value="a">A</ComboboxOption>
				</Combobox>
			</form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'combobox-input')

		await user.type(input, 'Ber')

		expect(input.value).toBe('Ber')

		expect(input.checkValidity()).toBe(false)
	})

	it('resolves required from an enclosing Control', () => {
		const { container } = renderUI(
			<Control required>
				<Combobox aria-label="City">
					<ComboboxOption value="a">A</ComboboxOption>
				</Combobox>
			</Control>,
		)

		const input = getSlot(container, 'combobox-input')

		expect(input).toBeRequired()

		expect(input).toHaveAttribute('aria-required', 'true')
	})
})

describe('Combobox readOnly', () => {
	const chevron = (container: HTMLElement) =>
		present(getSlot(container, 'suffix').querySelector('[data-slot="icon"]'), '[data-slot="icon"]')

	it('marks the input read-only without disabling it', () => {
		const { container } = renderUI(
			<Combobox readOnly aria-label="City">
				<ComboboxOption value="a">A</ComboboxOption>
			</Combobox>,
		)

		const input = getSlot<HTMLInputElement>(container, 'combobox-input')

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

		fireEvent.keyDown(getSlot<HTMLInputElement>(container, 'combobox-input'), { key: 'ArrowDown' })

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
	})

	// B04-C07: a controlled `open` shows the panel past the open guard, so the
	// guard must also block the selection, as in Listbox.
	it.each([
		['read-only', { readOnly: true }],
		['disabled', { disabled: true }],
	])('does not commit an option under a controlled open while %s', (_, lock) => {
		const onValueChange = vi.fn()

		renderUI(
			<Combobox {...lock} open aria-label="City" onValueChange={onValueChange}>
				<ComboboxOption value="paris">Paris</ComboboxOption>
			</Combobox>,
		)

		fireEvent.click(screen.getByRole('option', { name: 'Paris' }))

		expect(onValueChange).not.toHaveBeenCalled()
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

		// The submit handler awaits `onSubmit`, so the async `act` holds its update.
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
		})

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ city: 'paris' }),
			expect.anything(),
		)
	})
})

// A disabled `<fieldset>` disables the input natively and sets no prop. The
// Form uses it as its lock while it submits.
describe('Combobox in a disabled fieldset', () => {
	const chevron = (container: HTMLElement) =>
		present(getSlot(container, 'suffix').querySelector('[data-slot="icon"]'), '[data-slot="icon"]')

	it('does not open the menu on a press on the chevron', () => {
		const { container } = renderUI(
			<Fieldset disabled>
				<Combobox aria-label="City">
					<ComboboxOption value="paris">Paris</ComboboxOption>
				</Combobox>
			</Fieldset>,
		)

		fireEvent.mouseDown(chevron(container))

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
	})

	// The panel is in a portal outside the fieldset, so the option click
	// reaches its handler.
	it('does not commit an option under a controlled open', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Fieldset disabled>
				<Combobox open aria-label="City" onValueChange={onValueChange}>
					<ComboboxOption value="paris">Paris</ComboboxOption>
				</Combobox>
			</Fieldset>,
		)

		fireEvent.click(screen.getByRole('option', { name: 'Paris' }))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	// The open guard lets a close through, so only the press handlers keep a
	// press from closing the panel.
	it.each([
		['chevron', chevron],
		['frame', (container: HTMLElement) => getSlot(container, 'control-frame')],
	])('ignores a press on the %s under a controlled open', (_, target) => {
		const onOpenChange = vi.fn()

		const { container } = renderUI(
			<Fieldset disabled>
				<Combobox open aria-label="City" onOpenChange={onOpenChange}>
					<ComboboxOption value="paris">Paris</ComboboxOption>
				</Combobox>
			</Fieldset>,
		)

		fireEvent.mouseDown(target(container))

		expect(onOpenChange).not.toHaveBeenCalled()
	})
})

describe('ComboboxOption outside a Combobox', () => {
	// The host context is required. An orphan option must fail at render with
	// a message that names the missing host, not at the first click.
	it('throws a message that names the missing host', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() => renderUI(<ComboboxOption value="apple">Apple</ComboboxOption>)).toThrow(
			'ComboboxOption must be used within <Combobox>',
		)
	})
})
