import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { DatePicker } from '../../../components/date-picker'
import { present, renderUI, screen, waitFor } from '../../helpers'

/**
 * Layout stability on open (real floating engine). A modal
 * `FloatingFocusManager` imperatively inserts a hidden return-focus span as the
 * reference's next sibling while open. Without the picker's `display: contents`
 * wrapper, that extra sibling drops the control out of `:last-child`, so a
 * Tailwind `space-y` container (`> :not(:last-child)` margin) shifts the layout
 * the moment the popover opens. A single wrapper at `DatePicker` covers all
 * three render paths. Only this project sees it: the jsdom suite mocks the
 * focus manager (no fallback span) and has no layout.
 */
describe('layout stability (real browser): date picker in space-y container', () => {
	// `opener` is the role of the collapsed-state control that opens the popover.
	const cases: Array<{ name: string; opener: 'button' | 'combobox'; element: ReactElement }> = [
		{
			name: 'trigger',
			opener: 'combobox',
			element: <DatePicker clearable defaultValue={new Date(2025, 5, 15)} />,
		},
		{
			name: 'input',
			opener: 'button',
			element: <DatePicker input clearable defaultValue={new Date(2025, 5, 15)} />,
		},
		{
			name: 'range',
			opener: 'combobox',
			element: (
				<DatePicker range clearable defaultValue={[new Date(2025, 5, 15), new Date(2025, 5, 20)]} />
			),
		},
	]

	for (const { name, opener, element } of cases) {
		it(`does not grow the container or add control margin when the ${name} popover opens`, async () => {
			const { container } = renderUI(
				<div className="space-y-4" data-testid="stack">
					{element}
				</div>,
			)

			const stack = present(
				container.querySelector('[data-testid="stack"]'),
				'[data-testid="stack"]',
			)

			const control = present(stack.querySelector('[data-slot="control"]'), '[data-slot="control"]')

			const closedHeight = Math.round(stack.getBoundingClientRect().height)

			const closedChildren = stack.children.length

			// Open via the collapsed-state control: the trigger/range combobox, or
			// input mode's suffix "Open calendar" button. Each carries
			// aria-expanded, which the clearable clear button does not.
			await userEvent.click(screen.getByRole(opener, { expanded: false }))

			await screen.findByRole('dialog')

			// The fallback span is scoped under the `display: contents` wrapper, so
			// the stack keeps a single DOM child and the control gains no margin.
			await waitFor(() => expect(getComputedStyle(control).marginBottom).toBe('0px'))

			expect(stack.children.length).toBe(closedChildren)

			expect(Math.round(stack.getBoundingClientRect().height)).toBe(closedHeight)
		})
	}
})
