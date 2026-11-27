import { describe, expect, it } from 'vitest'
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
	})
})
