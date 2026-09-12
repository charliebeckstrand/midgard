import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import type { DatePickerRelativeValue } from '../../../components/date-picker'
import { DatePicker } from '../../../components/date-picker'
import { renderUI, screen, within } from '../../helpers'

/**
 * The relative picker's footer Clear hands focus on before it unmounts itself.
 *
 * Clearing empties the footer, so the button that ran the handler unmounts while it
 * holds focus, and the popover stays open on purpose. `FloatingFocusManager` then
 * re-seeds its own initial focus, which is the panel container — so focus is never
 * lost, and the hand-off's job is to reach a control rather than to rescue a trap.
 * Measured in this browser: the first preset with the hand-off, the `role="dialog"`
 * container without it, and `document.body` in neither case.
 *
 * The assertion belongs here rather than in a jsdom project. The double at
 * `src/__tests__/mocks/floating-ui.ts` implements no re-seed, so under it the
 * counterfactual is `document.body`, and jsdom with the real engine gives a third
 * answer again — the container even with the hand-off, because its focus timing is
 * not the browser's. Only a browser settles it.
 */
describe('relative DatePicker footer Clear (real browser, real engine)', () => {
	function Harness() {
		const [value, setValue] = useState<DatePickerRelativeValue[] | null>([
			{ from: new Date(2026, 0, 9), to: new Date(2026, 0, 15) },
		])

		return (
			<DatePicker relative value={value} onValueChange={setValue} aria-label="Reporting range" />
		)
	}

	it('lands focus on the first preset, not on the panel container', async () => {
		renderUI(<Harness />)

		await userEvent.click(screen.getByRole('button', { name: 'Reporting range' }))

		const clear = within(screen.getByRole('toolbar', { name: 'Date picker actions' })).getByRole(
			'button',
			{ name: 'Clear selection' },
		)

		await userEvent.click(clear)

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Today' }))

		// Without the hand-off this is the container, which is inside the trap and
		// tabbable out of — so the row the fix buys is a better landing, not a rescue.
		expect(document.activeElement).not.toBe(screen.getByRole('dialog'))
	})
})
