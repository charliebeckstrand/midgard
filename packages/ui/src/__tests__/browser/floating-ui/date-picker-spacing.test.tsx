import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { DatePicker } from '../../../components/date-picker'
import { renderUI, screen, waitFor } from '../../helpers'

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
	const cases: Array<{ name: string; element: ReactElement }> = [
		{ name: 'trigger', element: <DatePicker defaultValue={new Date(2025, 5, 15)} /> },
		{ name: 'input', element: <DatePicker input defaultValue={new Date(2025, 5, 15)} /> },
		{
			name: 'range',
			element: <DatePicker range defaultValue={[new Date(2025, 5, 15), new Date(2025, 5, 20)]} />,
		},
	]

	for (const { name, element } of cases) {
		it(`does not grow the container or add control margin when the ${name} popover opens`, async () => {
			const { container } = renderUI(
				<div className="space-y-4" data-testid="stack">
					{element}
				</div>,
			)

			const stack = container.querySelector('[data-testid="stack"]') as HTMLElement

			const control = stack.querySelector('[data-slot="control"]') as HTMLElement

			const closedHeight = Math.round(stack.getBoundingClientRect().height)

			const closedChildren = stack.children.length

			// Open via the collapsed-state button: the trigger/range display button,
			// or input mode's suffix "Open calendar" button. Each carries
			// aria-expanded, which the clearable clear button does not.
			await userEvent.click(screen.getByRole('button', { expanded: false }))

			await screen.findByRole('dialog')

			// The fallback span is scoped under the `display: contents` wrapper, so
			// the stack keeps a single DOM child and the control gains no margin.
			await waitFor(() => expect(getComputedStyle(control).marginBottom).toBe('0px'))

			expect(stack.children.length).toBe(closedChildren)

			expect(Math.round(stack.getBoundingClientRect().height)).toBe(closedHeight)
		})
	}
})
