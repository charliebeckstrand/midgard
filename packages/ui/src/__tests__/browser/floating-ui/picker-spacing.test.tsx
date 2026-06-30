import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ColorPicker } from '../../../components/color'
import { Listbox, ListboxOption } from '../../../components/listbox'
import { Select, SelectOption } from '../../../components/select'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Layout stability on open (real floating engine), the sibling of
 * `date-picker-spacing`. While open, a `FloatingFocusManager` imperatively
 * inserts a hidden return-focus span as the reference's next sibling — gated on
 * the floating element being portaled with a DOM reference, *not* on `modal`,
 * so a non-modal listbox manager inserts it too. Without each picker's
 * `display: contents` wrapper that extra sibling drops the control out of
 * `:last-child`, so a `space-y` container (`> :not(:last-child)` margin) grows a
 * gap below the control the moment the popover opens. A single wrapper per
 * picker keeps it a lone DOM child. Only the real browser sees it: the jsdom
 * suite mocks the focus manager (no fallback span) and has no layout.
 */
describe('layout stability (real browser): portal pickers in a space-y container', () => {
	const cases: Array<{
		name: string
		element: ReactElement
		triggerRole: string
		panelRole: string
		controlSlot: string
	}> = [
		{
			name: 'ColorPicker',
			element: <ColorPicker defaultValue="#ef4444" />,
			triggerRole: 'button',
			panelRole: 'dialog',
			controlSlot: 'control',
		},
		{
			name: 'Listbox',
			element: (
				<Listbox aria-label="pick" defaultValue="b" displayValue={(v: string) => v}>
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
			),
			triggerRole: 'combobox',
			panelRole: 'listbox',
			controlSlot: 'listbox',
		},
		{
			name: 'Select',
			element: (
				<Select aria-label="choose" defaultValue="b" displayValue={(v: string) => v}>
					<SelectOption value="a">A</SelectOption>
					<SelectOption value="b">B</SelectOption>
				</Select>
			),
			triggerRole: 'combobox',
			panelRole: 'listbox',
			controlSlot: 'select',
		},
	]

	for (const { name, element, triggerRole, panelRole, controlSlot } of cases) {
		it(`does not add control margin or grow the container when the ${name} popover opens`, async () => {
			const { container } = renderUI(
				<div className="space-y-4" data-testid="stack">
					{element}
				</div>,
			)

			const stack = container.querySelector('[data-testid="stack"]') as HTMLElement

			const control = stack.querySelector(`[data-slot="${controlSlot}"]`) as HTMLElement

			const closedHeight = Math.round(stack.getBoundingClientRect().height)

			const closedChildren = stack.children.length

			await userEvent.click(screen.getByRole(triggerRole))

			await screen.findByRole(panelRole)

			// The fallback span is scoped under the `display: contents` wrapper, so the
			// stack keeps a single DOM child and the control gains no margin.
			await waitFor(() => expect(getComputedStyle(control).marginBottom).toBe('0px'))

			expect(stack.children.length).toBe(closedChildren)

			expect(Math.round(stack.getBoundingClientRect().height)).toBe(closedHeight)
		})
	}
})
