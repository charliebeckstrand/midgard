// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { contrastMore, tone } from '../../recipes/kiso/sen/tone'
import { contrastRatio, WCAG_NON_TEXT } from '../../utilities/contrast'
import { SURFACE, tinted } from '../helpers/contrast'

/**
 * When the user asks for more contrast, each line tone draws at a 3:1 contrast
 * on the page background.
 *
 * The tones are 5% to 20% alpha, which gives a line about 1.1:1 to 1.6:1.
 * `forced-colors` restores the edges in a forced palette. A user who only asks
 * for more contrast (`prefers-contrast: more`) got the faint lines.
 */
describe('sen tone under prefers-contrast: more', () => {
	const visible = Object.entries(tone).filter(([name]) => name !== 'borderTransparent')

	it.each(visible)('gives the %s tone a step in each mode', (_, classes) => {
		expect(classes.some((cls) => cls.startsWith('contrast-more:'))).toBe(true)

		expect(classes.some((cls) => cls.startsWith('dark:contrast-more:'))).toBe(true)
	})

	for (const mode of ['light', 'dark'] as const) {
		it.each(Object.entries(contrastMore))(
			`draws the %s step at ${WCAG_NON_TEXT}:1 in ${mode}`,
			(_, step) => {
				const line = step[mode].replace(/^(dark:)?contrast-more:/, '')

				const ratio = contrastRatio(tinted(line, SURFACE[mode]), SURFACE[mode])

				expect(ratio).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
			},
		)
	}
})
