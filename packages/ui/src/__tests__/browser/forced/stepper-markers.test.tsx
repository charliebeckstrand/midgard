import { describe, expect, it } from 'vitest'
import {
	Stepper,
	StepperIndicator,
	StepperSeparator,
	StepperStep,
	StepperTitle,
} from '../../../components/stepper'
import { baseline } from '../../a11y/cases'
import { present, renderUI } from '../../helpers'
import { eachAuthorScheme, systemColor } from '../helpers/forced-colors'

/**
 * The markers of a Stepper under forced colors. A marker shows the state of its step with only
 * its fill, and forced colors remove each fill. Without a fallback, the marker of an upcoming
 * step disappears, and the current step reads as the completed one. Each marker keeps a 1 px
 * outline, and the fill of the current step paints in `Highlight`.
 */

const cases = baseline.filter((entry) => entry.name.startsWith('stepper'))

/** A numbered stepper on its second step, display-only or with step buttons. */
function numbered(interactive: boolean) {
	const value = interactive ? { defaultValue: 1 } : { value: 1 }

	return (
		<Stepper {...value}>
			{['Account', 'Profile', 'Confirm'].map((title, index) => [
				index > 0 && <StepperSeparator key={`s${title}`} />,
				<StepperStep key={title} value={index}>
					<StepperIndicator>{index + 1}</StepperIndicator>
					<StepperTitle>{title}</StepperTitle>
				</StepperStep>,
			])}
		</Stepper>
	)
}

describe('stepper markers under forced colors (real browser)', () => {
	eachAuthorScheme(() => {
		it.each(cases.map((entry) => [entry.name, entry.element] as const))(
			'outlines each marker of the %s, and fills the current step in Highlight',
			(_name, element) => {
				const { container } = renderUI(element)

				const markers = [
					...container.querySelectorAll<HTMLElement>('[data-slot=stepper-indicator]'),
				]

				expect(markers).toHaveLength(3)

				for (const marker of markers) {
					const style = getComputedStyle(marker)

					expect(`${style.outlineStyle} ${style.outlineWidth}`).toBe('solid 1px')
				}

				const current = present(
					container.querySelector<HTMLElement>('[data-slot=active-indicator]'),
					'the fill of the current step',
				)

				expect(getComputedStyle(current).backgroundColor).toBe(systemColor('Highlight'))
			},
		)

		/**
		 * The number of the current step sits on the `Highlight` fill. `Highlight` does not keep the
		 * contrast of `CanvasText` or `ButtonText`, so the number takes `HighlightText`. It does not
		 * adjust, so the browser paints no `Canvas` plate behind it.
		 */
		it.each([false, true])(
			'paints the number of the current step in HighlightText (interactive: %s)',
			(interactive) => {
				const { container } = renderUI(numbered(interactive))

				const current = present(
					container.querySelector<HTMLElement>(
						'[data-state=current] [data-slot=stepper-indicator] > span:last-child',
					),
					'the number of the current step',
				)

				expect(current.textContent).toBe('2')

				const style = getComputedStyle(current)

				expect(style.color).toBe(systemColor('HighlightText'))

				expect(style.forcedColorAdjust).toBe('none')
			},
		)
	})
})
