import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { renderUI } from '../helpers'

/**
 * What the pointer says over a tooltip trigger that cannot be pressed.
 *
 * A trigger wears `cursor-help`, and it wears it on its children too — a trigger is usually a
 * control with an icon in it, and the icon is most of what the pointer is actually over. That
 * child rule is what made a refused action offer the reader help instead of saying it was
 * refused: `hannou.cursor` gives a disabled control `cursor-not-allowed` and `cursor` inherits,
 * so the icon would have taken it for free, but the trigger set it explicitly and won.
 *
 * Rides the real browser because the claim is a computed one. jsdom loads no stylesheet, so
 * `getComputedStyle(…).cursor` there is empty whatever the class list says — the only thing
 * assertable without a browser is the class string, which is the mechanism rather than the
 * behaviour and stays green through a variant rename that breaks it.
 */
describe('a disabled tooltip trigger (real browser)', () => {
	function render(disabled: boolean) {
		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<Button type="button" disabled={disabled}>
						<span data-slot="probe-child">Rotate</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent>Rotate</TooltipContent>
			</Tooltip>,
		)

		const control = container.querySelector('button') as HTMLElement

		return {
			control,
			child: control.querySelector('[data-slot="probe-child"]') as HTMLElement,
		}
	}

	it('says the action is refused, on the control and on what is inside it', () => {
		const { control, child } = render(true)

		expect(getComputedStyle(control).cursor).toBe('not-allowed')

		// The half that was wrong: the glyph is where the pointer spends its time.
		expect(getComputedStyle(child).cursor).toBe('not-allowed')
	})

	it('still offers help where there is something to ask', () => {
		const { control, child } = render(false)

		expect(getComputedStyle(control).cursor).toBe('help')
		expect(getComputedStyle(child).cursor).toBe('help')
	})
})
